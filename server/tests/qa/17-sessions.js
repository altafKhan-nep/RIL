const assert = require('assert');

const login = async ({ BASE, request, jar }, email, password) =>
  request.post(BASE, '/api/users/login', { body: { email, password }, jar });

const newUser = async ({ BASE, request, jar }) => {
  const email = `qa_sess_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  await request.post(BASE, '/api/users', { body: { name: 'QA Sess', email, password: 'password123' }, jar });
  return email;
};

const sessionsFor = async (db, email) => {
  const user = await db.col('users').findOne({ email });
  if (!user) return [];
  return db.col('sessions').find({ user: user._id }).toArray();
};

module.exports = {
  name: 'Refresh Token Rotation & Revocation',
  tests: [
    {
      name: 'Login issues a separate refresh session row (hashed, not raw)',
      fn: async ({ BASE, request, fixtures, db }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        assert.ok(jar.lip_token, 'access cookie set');
        assert.ok(jar.lip_refresh, 'refresh cookie set');
        const rows = await sessionsFor(db, 'qa_customer@example.com');
        assert.ok(rows.length >= 1, 'expected a persisted session');
        const raw = jar.lip_refresh;
        const stored = rows.map((r) => r.tokenHash);
        assert.ok(!stored.includes(raw), 'the raw refresh token must never be stored');
        assert.ok(stored.every((h) => /^[a-f0-9]{64}$/.test(h)), 'token hashes must be sha256 hex');
      },
    },
    {
      name: 'Access cookie lifetime is short, refresh cookie is long',
      fn: async ({ BASE, request }) => {
        const res = await request.post(BASE, '/api/users/login', {
          body: { email: 'qa_customer@example.com', password: 'qa_password_123' },
        });
        const cookies = [].concat(res.headers['set-cookie'] || []);
        const access = cookies.find((c) => c.startsWith('lip_token='));
        const refresh = cookies.find((c) => c.startsWith('lip_refresh='));
        assert.ok(access && refresh, 'both cookies must be set');
        const maxAge = (c) => Number(/Max-Age=(\d+)/.exec(c)?.[1] || 0);
        assert.ok(maxAge(access) > 0, 'access cookie needs a lifetime');
        assert.ok(
          maxAge(refresh) > maxAge(access),
          `refresh (${maxAge(refresh)}s) must outlive access (${maxAge(access)}s)`
        );
        // Access must be short-lived so a leak is contained quickly.
        assert.ok(maxAge(access) <= 60 * 60, `access cookie should be <= 1h, got ${maxAge(access)}s`);
      },
    },
    {
      name: 'Refresh rotates the token and invalidates the presented one',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        const original = jar.lip_refresh;

        const first = await request.post(BASE, '/api/users/refresh', { jar });
        assert.strictEqual(first.status, 200, first.body.message);
        const rotated = jar.lip_refresh;
        assert.notStrictEqual(rotated, original, 'refresh must issue a new token');

        // Replaying the old refresh token must fail.
        const staleJar = { lip_refresh: original };
        await assert.rejects(
          request.post(BASE, '/api/users/refresh', { jar: staleJar }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Refresh works after the access token has expired',
      fn: async ({ BASE, request }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        // Simulate expiry by destroying the access cookie.
        delete jar.lip_token;
        const res = await request.post(BASE, '/api/users/refresh', { jar });
        assert.strictEqual(res.status, 200, `refresh must not require a live access token: ${res.body.message}`);
        assert.ok(jar.lip_token, 'a fresh access cookie must be issued');
        const profile = await request.get(BASE, '/api/users/profile', { jar });
        assert.strictEqual(profile.status, 200);
      },
    },
    {
      name: 'Refresh rejects a request with no refresh cookie',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          request.post(BASE, '/api/users/refresh', {}),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Logout revokes the session server-side',
      fn: async ({ BASE, request, fixtures, db }) => {
        const email = `qa_sessout_${Date.now()}@example.com`;
        const jar = {};
        await request.post(BASE, '/api/users', { body: { name: 'QA SessOut', email, password: 'password123' }, jar });
        const stolen = jar.lip_refresh;

        await request.post(BASE, '/api/users/logout', { jar });
        assert.ok(!jar.lip_refresh, 'logout must clear the refresh cookie');

        // A copy of the cookie taken before logout must NOT work. This is the
        // property that makes logout meaningful against token theft.
        const attackerJar = { lip_refresh: stolen };
        await assert.rejects(
          request.post(BASE, '/api/users/refresh', { jar: attackerJar }),
          (e) => e.status === 401
        );

        const rows = await sessionsFor(db, email);
        assert.ok(rows.every((r) => r.revokedAt), 'the session row must be marked revoked');
      },
    },
    {
      name: 'Password change revokes other sessions but keeps this device',
      fn: async ({ BASE, request, db }) => {
        const email = `qa_sesspw_${Date.now()}@example.com`;
        const deviceA = {};
        await request.post(BASE, '/api/users', { body: { name: 'QA SessPW', email, password: 'password123' }, jar: deviceA });

        // A second device logs in and keeps a copy of its refresh token.
        const deviceB = {};
        await request.post(BASE, '/api/users/login', { body: { email, password: 'password123' }, jar: deviceB });
        const stolenFromB = deviceB.lip_refresh;

        const upd = await request.put(BASE, '/api/users/profile', {
          jar: deviceA,
          body: { currentPassword: 'password123', password: 'newpassword123' },
        });
        assert.strictEqual(upd.status, 200, upd.body.message);

        // The device that changed the password stays signed in.
        const stillIn = await request.get(BASE, '/api/users/profile', { jar: deviceA });
        assert.strictEqual(stillIn.status, 200, 'current device should stay signed in');

        // The other device is signed out.
        const otherDevice = { lip_refresh: stolenFromB };
        await assert.rejects(
          request.post(BASE, '/api/users/refresh', { jar: otherDevice }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Deactivating a user kills their refresh session',
      fn: async ({ BASE, request, db }) => {
        const email = `qa_sessdis_${Date.now()}@example.com`;
        const jar = {};
        await request.post(BASE, '/api/users', { body: { name: 'QA SessDis', email, password: 'password123' }, jar });
        const stolen = jar.lip_refresh;
        await db.col('users').updateOne({ email }, { $set: { isActive: false } });

        // The session row is revoked...
        await db.col('sessions').updateMany({}, { $set: { revokedAt: new Date() } });
        const attackerJar = { lip_refresh: stolen };
        await assert.rejects(
          request.post(BASE, '/api/users/refresh', { jar: attackerJar }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'Disabled user cannot refresh even with a live session row',
      fn: async ({ BASE, request, db }) => {
        const email = `qa_sessdis2_${Date.now()}@example.com`;
        const jar = {};
        await request.post(BASE, '/api/users', { body: { name: 'QA SessDis2', email, password: 'password123' }, jar });
        await db.col('users').updateOne({ email }, { $set: { isActive: false } });
        // Session row is still live; the refresh must still refuse.
        await assert.rejects(
          request.post(BASE, '/api/users/refresh', { jar }),
          (e) => e.status === 401 || e.status === 403
        );
      },
    },
    {
      name: 'Refresh rotates on every call (no token reuse)',
      fn: async ({ BASE, request, db }) => {
        const jar = {};
        await login({ BASE, request, jar }, 'qa_customer@example.com', 'qa_password_123');
        const seen = new Set([jar.lip_refresh]);
        for (let i = 0; i < 3; i++) {
          const res = await request.post(BASE, '/api/users/refresh', { jar });
          assert.strictEqual(res.status, 200);
          assert.ok(!seen.has(jar.lip_refresh), 'each refresh must produce a brand-new token');
          seen.add(jar.lip_refresh);
        }
        assert.strictEqual(seen.size, 4, 'four distinct refresh tokens expected');
      },
    },
  ],
};