const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Usa /app/data se existir (Railway volume persistente), senão pasta local
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : __dirname;
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'data.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── TABLES ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    username  TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    role      TEXT NOT NULL DEFAULT 'operador',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL,
    emoji      TEXT DEFAULT '🍽️',
    photo_url  TEXT,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id      INTEGER NOT NULL UNIQUE REFERENCES dishes(id) ON DELETE CASCADE,
    rendimento   TEXT,
    tempo_preparo TEXT,
    tempo_forno  TEXT,
    custo        TEXT,
    modo         TEXT,
    observacoes  TEXT,
    created_by   INTEGER REFERENCES users(id),
    updated_by   INTEGER REFERENCES users(id),
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    updated_at   TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    nome      TEXT NOT NULL,
    qtd       TEXT,
    un        TEXT,
    ordem     INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    user_name  TEXT,
    action     TEXT NOT NULL,
    target     TEXT,
    details    TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ── MIGRATIONS ───────────────────────────────────────
function safeAddColumn(table, column, type) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.find(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch(e) { /* column exists */ }
}

safeAddColumn('dishes', 'created_by', 'INTEGER REFERENCES users(id)');
safeAddColumn('dishes', 'updated_by', 'INTEGER REFERENCES users(id)');
safeAddColumn('recipes', 'created_by', 'INTEGER REFERENCES users(id)');
safeAddColumn('recipes', 'updated_by', 'INTEGER REFERENCES users(id)');
safeAddColumn('recipes', 'created_at', "TEXT DEFAULT (datetime('now','localtime'))");

// Migração: se existir usuários com role='viewer', converter para 'operador'
try {
  db.prepare("UPDATE users SET role='operador' WHERE role='viewer'").run();
} catch(e) {}

// ── SEED ADMIN ──────────────────────────────────────
function seedAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!exists) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASS || 'toca2024', 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
      .run('Administrador', 'admin', hash, 'admin');
    console.log('✅ Admin criado');
  }
}

// ── SEED DISHES ─────────────────────────────────────
function seedDishes() {
  const count = db.prepare('SELECT COUNT(*) as c FROM dishes').get().c;
  if (count > 0) return;

  const seedPath = path.join(__dirname, 'produtos_seed.json');
  if (!fs.existsSync(seedPath)) return;

  try {
    const produtos = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const insert = db.prepare('INSERT INTO dishes (name, category, emoji) VALUES (?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const p of items) {
        insert.run(p.name || p.nome, p.category || p.categoria || 'Outro', p.emoji || '🍽️');
      }
    });
    insertMany(produtos);
    console.log(`✅ ${produtos.length} pratos importados`);
  } catch(e) {
    console.error('Erro no seed de pratos:', e.message);
  }
}

seedAdmin();
seedDishes();

module.exports = db;
