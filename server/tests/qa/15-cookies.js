const assert = require('assert');

const register = async ({ BASE, request, jar }, name, email, password) =>
  request.post(BASE, '/api/users', { body: { name, email, password }, jar });

const login = async ({ BASE, request, jar }, email, password) =>
  request.post(BASE, '/api/users/login', { body: { email, password }, jar });

module.exports = {
  name: 'Cookie Session Auth (httpOnly)',
  tests: [
    {
      name: 'Login sets an httpOnly session cookie',
      fn: async ({ BASE, request }) => {
        const jar = {};
        const res = await login({ BASE, request, jar }, 'qa_admin@example.com', 'qa_password_123');
        const cookies = [].concat(res.headers['set-cookie'] || []);
        const auth = cookies.find((c) => c.startsWith('lip_token='));
        assert.ok(auth, `expected a lip_token cookie, got: ${JSON.stringify(cookies)}`);
        assert.match(auth, /HttpOnly/i, 'auth cookie must be HttpOnly so script cannot read it');
        assert.match(auth, /SameSite=Lax/i, 'auth cookie must set SameSite');
        assert.match(auth, /Path=\//i);
        assert.ok(/Max-Age=\d+/.test(auth), 'cookie should have a lifetime matching the JWT');
        assert.ok(jar.lip_token, 'cookie should be stored in the jar');
      },
    },
    {
      name: 'Protected route accepts the cookie with no Authorization header',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        assert.ok(jar.lip_token, 'login should populate the cookie jar');
        const res = await request.get(BASE, '/api/users/profile', { jar });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.email, 'qa_customer@example.com');
      },
    },
    {
      name: 'Protected route rejects a request with no cookie and no bearer',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          request.get(BASE, '/api/users/profile', {}),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Bearer tokens still work for API clients',
      fn: async ({ BASE, request }) => {
        const res = await request.post(BASE, '/api/users/login', { body: { email: 'qa_customer@example.com', password: 'qa_password_123' } });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.token, 'API clients still receive a bearer token');
        const profile = await request.get(BASE, '/api/users/profile', { token: res.body.token });
        assert.strictEqual(profile.status, 200);
      },
    },
    {
      name: 'Logout clears the cookie and blocks further cookie auth',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        assert.ok(jar.lip_token);
        const out = await request.post(BASE, '/api/users/logout', { jar });
        assert.strictEqual(out.status, 200);
        assert.ok(!jar.lip_token, 'logout must remove the cookie from the jar');
        await assert.rejects(
          request.get(BASE, '/api/users/profile', { jar }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Refresh re-issues a usable cookie without exposing it to JS',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        const before = jar.lip_token;
        const res = await request.post(BASE, '/api/users/refresh', { jar });
        assert.strictEqual(res.status, 200);
        assert.ok(jar.lip_token, 'refresh should set a cookie');
        assert.ok(res.setCookie.some((c) => /HttpOnly/i.test(c)), 'refreshed cookie must stay HttpOnly');
        const profile = await request.get(BASE, '/api/users/profile', { jar });
        assert.strictEqual(profile.status, 200);
      },
    },
    {
      name: 'Password change replaces the cookie and revokes the old token',
      fn: async ({ BASE, request }) => {
        const email = `qa_cookie_${Date.now()}@example.com`;
        const jar = {};
        await register({ BASE, request, jar }, 'QA Cookie', email, 'oldpassword123');
        const oldBearerRes = await request.post(BASE, '/api/users/login', { body: { email, password: 'oldpassword123' } });
        const oldToken = oldBearerRes.body.token;

        // Change the password using only the cookie.
        const upd = await request.put(BASE, '/api/users/profile', {
          jar,
          body: { currentPassword: 'oldpassword123', password: 'newpassword123' },
        });
        assert.strictEqual(upd.status, 200, upd.body.message);

        // The cookie session must keep working (new cookie was issued).
        const profile = await request.get(BASE, '/api/users/profile', { jar });
        assert.strictEqual(profile.status, 200, 'cookie session should survive a password change');

        // The previously issued bearer token must be revoked.
        await assert.rejects(
          request.get(BASE, '/api/users/profile', { token: oldToken }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Registration sets a session cookie too',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await register({ BASE, request, jar }, 'QA Cookie Reg', `qa_reg_${Date.now()}@example.com`, 'password123');
        assert.ok(jar.lip_token, 'registration should establish a session');
        const profile = await request.get(BASE, '/api/users/profile', { jar });
        assert.strictEqual(profile.status, 200);
      },
    },
    {
      name: 'Cookie auth honours permissions like bearer auth',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        // Customers must not reach an admin-only endpoint even with a valid cookie.
        await assert.rejects(
          request.get(BASE, '/api/admin/stats', { jar }),
          (e) => e.status === 403
        );
      },
    },
    {
      name: 'Disabled user with a valid cookie is rejected',
      fn: async ({ BASE, request, db }) => {
        const email = `qa_cookedisabled_${Date.now()}@example.com`;
        const jar = {};
        await register({ BASE, request, jar }, 'QA Cookie Disabled', email, 'password123');
        await db.col('users').updateOne({ email }, { $set: { isActive: false } });
        await assert.rejects(
          request.get(BASE, '/api/users/profile', { jar }),
          (e) => e.status === 403
        );
      },
    },
    {
      name: 'A tampered cookie value is rejected',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        jar.lip_token = jar.lip_token.slice(0, -3) + 'AAA';
        await assert.rejects(
          request.get(BASE, '/api/users/profile', { jar }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'No endpoint ever returns the token inside a readable cookie',
      fn: async ({ BASE, request }) => {
        const res = await request.post(BASE, '/api/users/login', { body: { email: 'qa_customer@example.com', password: 'qa_password_123' } });
        const cookies = [].concat(res.headers['set-cookie'] || []);
        assert.ok(cookies.length > 0, 'expected a cookie to be set');
        for (const c of cookies) {
          if (c.startsWith('lip_token=')) {
            assert.match(c, /HttpOnly/i, 'the session cookie must always be HttpOnly');
          }
        }
      },
    },
  ],
};