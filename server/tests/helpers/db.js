const mongoose = require('mongoose');

const QA_URI = process.env.QA_MONGO_URI || 'mongodb://localhost:27017/novacart_qa';

let connected = false;

async function connect() {
  if (connected) return mongoose.connection;
  await mongoose.connect(QA_URI);
  connected = true;
  return mongoose.connection;
}

async function disconnect() {
  if (connected) {
    await mongoose.disconnect();
    connected = false;
  }
}

function db() {
  return mongoose.connection.db;
}

function col(name) {
  return mongoose.connection.db.collection(name);
}

async function clearAll() {
  const c = mongoose.connection.db;
  const names = (await c.listCollections().toArray()).map((x) => x.name);
  for (const n of names) {
    if (!n.startsWith('system.')) await c.collection(n).deleteMany({});
  }
}

module.exports = { connect, disconnect, db, col, clearAll, QA_URI };