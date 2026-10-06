const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const BASE = process.env.QA_BASE_URL || 'http://localhost:5001';
const SERVER_DIR = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, ok: true });
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, ok: false, error: err.message });
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}`);
    console.log(`       ${err.message}`);
  }
}

const assert = require('assert');

function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'));
      setTimeout(tick, 500);
    };
    const tick = () => {
      const req = http.get(`${url}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
    };
    tick();
  });
}

async function startServer() {
  const env = { ...process.env, MONGO_URI: process.env.QA_MONGO_URI || 'mongodb://localhost:27017/novacart_qa', NODE_ENV: 'test', JWT_SECRET: process.env.QA_JWT_SECRET || 'qa_test_secret', ORDER_RATE_LIMIT_MAX: process.env.QA_ORDER_RATE_LIMIT || '100000', LOGIN_RATE_LIMIT_MAX: process.env.QA_LOGIN_RATE_LIMIT || '100000', STRIPE_SECRET_KEY: process.env.QA_STRIPE_SECRET_KEY || 'sk_test_qa_dummy', STRIPE_WEBHOOK_SECRET: process.env.QA_STRIPE_WEBHOOK_SECRET || 'whsec_qa_dummy_secret', STRIPE_PUBLISHABLE_KEY: process.env.QA_STRIPE_PUBLISHABLE_KEY || 'pk_test_qa_dummy' };
  const child = spawn('node', ['server.js'], { cwd: SERVER_DIR, env, stdio: 'ignore' });
  await waitForServer(BASE);
  return child;
}

async function runSuites(suiteFiles) {
  for (const file of suiteFiles) {
    const suite = require(path.resolve(file));
    console.log(`\n\x1b[1m\x1b[36m=== ${suite.name} ===\x1b[0m`);
    for (const t of suite.tests) {
      await test(t.name, () => t.fn(suite.ctx));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const only = args[0];

  console.log('\n\x1b[1m\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[35m║        RIL QA TEST SUITE                      ║\x1b[0m');
  console.log('\x1b[1m\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m\n');

  // Seed the isolated QA database with deterministic fixtures
  const db = require('./helpers/db');
  const fixtures = require('./helpers/fixtures');
  await db.connect();
  await db.clearAll();
  await fixtures.seed(db.db());
  console.log('QA database seeded with fixtures.\n');

  let server;
  const manageServer = !process.env.QA_BASE_URL;
  if (manageServer) {
    console.log('Starting QA server on isolated database...');
    server = await startServer();
    console.log('QA server ready.\n');
  }

  const suiteDir = path.join(__dirname, 'qa');
  let files = fs.readdirSync(suiteDir).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(suiteDir, f));
  if (only) files = files.filter((f) => f.includes(only));

  const suites = files.map((f) => require(f));
  for (const suite of suites) {
    console.log(`\n\x1b[1m\x1b[36m=== ${suite.name} ===\x1b[0m`);
    suite.ctx = { BASE, request: require('./helpers/http'), db: require('./helpers/db'), fixtures: require('./helpers/fixtures') };
    for (const t of suite.tests) {
      await test(t.name, () => t.fn(suite.ctx));
    }
  }

  if (server) server.kill();
  await db.disconnect();

  console.log(`\n\x1b[1m\x1b[36m──────────────────────────────────────\x1b[0m`);
  console.log(`  Total: ${passed + failed}  \x1b[32mPassed: ${passed}\x1b[0m  \x1b[31mFailed: ${failed}\x1b[0m`);
  const pct = passed + failed ? ((passed / (passed + failed)) * 100).toFixed(1) : 0;
  console.log(`  Rate: ${pct}%`);

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ passed, failed, results }, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });