const assert = require('assert');

async function register({ BASE, request }, name, email, password) {
  return request.post(BASE, '/api/users', { body: { name, email, password } });
}
async function login({ BASE, request }, email, password) {
  return request.post(BASE, '/api/users/login', { body: { email, password } });
}

module.exports = {
  name: 'Authentication & Registration',
  tests: [
    {
      name: 'Register valid user returns token and does not crash',
      fn: async ({ BASE, request, fixtures }) => {
        const email = `qa_reg_${Date.now()}@example.com`;
        const res = await register({ BASE, request }, 'QA Reg User', email, 'password123');
        assert.strictEqual(res.status, 201, res.body.message);
        assert.ok(res.body.token, 'expected token');
        assert.ok(res.body._id, 'expected _id');
      },
    },
    {
      name: 'Register duplicate email returns 400',
      fn: async ({ BASE, request, fixtures }) => {
        await assert.rejects(
          register({ BASE, request }, 'Dup', fixtures.USERS.customer.email, 'password123'),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Register invalid email returns 400',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          register({ BASE, request }, 'Bad Email', 'not-an-email', 'password123'),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Register short password returns 400',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          register({ BASE, request }, 'Short Pw', `qa_short_${Date.now()}@example.com`, '123'),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Register blank name returns 400',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          register({ BASE, request }, '   ', `qa_blank_${Date.now()}@example.com`, 'password123'),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Login valid credentials returns token',
      fn: async ({ BASE, request, fixtures }) => {
        const res = await login({ BASE, request }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.token);
      },
    },
    {
      name: 'Login wrong password returns 401',
      fn: async ({ BASE, request, fixtures }) => {
        await assert.rejects(
          login({ BASE, request }, fixtures.USERS.customer.email, 'wrongpassword'),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Login unknown email returns 401',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          login({ BASE, request }, 'nobody@example.com', 'password123'),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Login empty body returns 400',
      fn: async ({ BASE, request }) => {
        await assert.rejects(login({ BASE, request }, undefined, undefined), (e) => e.status >= 400);
      },
    },
    {
      name: 'Profile update name persists',
      fn: async ({ BASE, request, fixtures }) => {
        const token = (await login({ BASE, request }, fixtures.USERS.customer.email, fixtures.USERS.customer.password)).body.token;
        const res = await request.put(BASE, '/api/users/profile', { token, body: { name: 'QA Renamed' } });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.name, 'QA Renamed');
      },
    },
    {
      name: 'Password change requires current password',
      fn: async ({ BASE, request }) => {
        const email = `qa_pwcur_${Date.now()}@example.com`;
        await register({ BASE, request }, 'QA PW Cur', email, 'oldpassword123');
        const token = (await login({ BASE, request }, email, 'oldpassword123')).body.token;
        // Changing a password without proving the current one must fail.
        await assert.rejects(
          request.put(BASE, '/api/users/profile', { token, body: { password: 'newpassword123' } }),
          (e) => e.status === 400
        );
        // Wrong current password must fail.
        await assert.rejects(
          request.put(BASE, '/api/users/profile', { token, body: { currentPassword: 'nope123', password: 'newpassword123' } }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Password change: new password works, old fails, old token revoked',
      fn: async ({ BASE, request }) => {
        const email = `qa_pw_${Date.now()}@example.com`;
        await register({ BASE, request }, 'QA PW', email, 'oldpassword123');
        const oldToken = (await login({ BASE, request }, email, 'oldpassword123')).body.token;
        const upd = await request.put(BASE, '/api/users/profile', {
          token: oldToken,
          body: { currentPassword: 'oldpassword123', password: 'newpassword123' },
        });
        assert.strictEqual(upd.status, 200, upd.body.message);

        // Old token must be invalidated by the password change.
        await assert.rejects(request.get(BASE, '/api/users/profile', { token: oldToken }), (e) => e.status === 401);

        // New password works, old password no longer does.
        const newLogin = await login({ BASE, request }, email, 'newpassword123');
        assert.strictEqual(newLogin.status, 200, 'new password should work');
        await assert.rejects(login({ BASE, request }, email, 'oldpassword123'), (e) => e.status === 401);
      },
    },
    {
      name: 'Deactivated account cannot log in',
      fn: async ({ BASE, request, db }) => {
        const email = `qa_disabled_${Date.now()}@example.com`;
        await register({ BASE, request }, 'QA Disabled', email, 'password123');
        await db.col('users').updateOne({ email }, { $set: { isActive: false } });
        await assert.rejects(login({ BASE, request }, email, 'password123'), (e) => e.status === 403);
      },
    },
    {
      name: 'Protected route without token returns 401',
      fn: async ({ BASE, request }) => {
        await assert.rejects(request.get(BASE, '/api/users/profile'), (e) => e.status === 401);
      },
    },
    {
      name: 'Protected route with garbage token returns 401',
      fn: async ({ BASE, request }) => {
        await assert.rejects(request.get(BASE, '/api/users/profile', { token: 'garbage.token.here' }), (e) => e.status === 401);
      },
    },
  ],
};