const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

let db;

function attachHelpers(database) {
  database.transaction = function transaction(fn) {
    return function runTransaction(...args) {
      database.exec('BEGIN IMMEDIATE');
      try {
        const result = fn(...args);
        database.exec('COMMIT');
        return result;
      } catch (err) {
        database.exec('ROLLBACK');
        throw err;
      }
    };
  };
  return database;
}

function getDb() {
  if (!db) {
    const dataDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    db = attachHelpers(new DatabaseSync(config.dbPath));
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    migrateUsers();
    initDefaultSettings();
  }
  return db;
}

function migrateUsers() {
  const cols = db.prepare('PRAGMA table_info(users)').all();
  const hasUsername = cols.some((c) => c.name === 'username');

  if (!hasUsername) {
    db.exec('ALTER TABLE users ADD COLUMN username TEXT');
    const users = db.prepare('SELECT id, email FROM users').all();
    const used = new Set();
    users.forEach((u) => {
      let base = (u.email || 'admin').split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'admin';
      let username = base;
      let n = 1;
      while (used.has(username)) username = `${base}${n++}`;
      used.add(username);
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, u.id);
    });
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');
}

function initDefaultSettings() {
  const defaults = {
    site_name: 'Manşet Parti & Organizasyon',
    site_tagline: 'Organizasyonlarınızı Renklendiriyoruz',
    contact_phone: '0507 544 04 24',
    contact_whatsapp: '905075440424',
    contact_email: 'info@mansetparti.com',
    contact_address: 'Konya, Türkiye (42030)',
    instagram_url: 'https://instagram.com/manset_parti42',
    payment_credit_card: '1',
    payment_cash_on_delivery: '1',
    payment_card_on_delivery: '1',
    shipping_fee: '49',
    free_shipping_threshold: '500',
    iyzico_enabled: '0',
    stripe_enabled: '0',
  };

  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)
  `);

  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insert.run({ key, value });
    }
  });
  tx();
}

function getSetting(key, fallback = '') {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function setSetting(key, value) {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .run(key, String(value));
}

module.exports = { getDb, getSetting, getAllSettings, setSetting };
