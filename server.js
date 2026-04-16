const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'toca-coelho-secret-2024';
const APP_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

// ── DIRS ─────────────────────────────────────────────
const DATA_DIR = '/app/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'data.db');

// ══════════════════════════════════════════════════════
//  1. VERIFICAÇÃO DE INTEGRIDADE NO BOOT
// ══════════════════════════════════════════════════════
function checkIntegrity() {
  try {
    const result = db.prepare('PRAGMA integrity_check').get();
    if (result?.integrity_check === 'ok') {
      console.log('✅ Banco de dados íntegro.');
    } else {
      console.error('❌ ATENÇÃO: Banco de dados com problema!', result);
    }
    const counts = {
      usuarios:    db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      pratos:      db.prepare('SELECT COUNT(*) as c FROM dishes').get().c,
      receitas:    db.prepare('SELECT COUNT(*) as c FROM recipes').get().c,
      ingredientes:db.prepare('SELECT COUNT(*) as c FROM ingredients').get().c,
      atividades:  db.prepare('SELECT COUNT(*) as c FROM activity_log').get().c,
    };
    console.log('📊 Estado do banco:', counts);
  } catch(e) {
    console.error('❌ Erro ao verificar integridade:', e.message);
  }
}

// ══════════════════════════════════════════════════════
//  2. BACKUP AUTOMÁTICO A CADA 6 HORAS
// ══════════════════════════════════════════════════════
function runBackup() {
  try {
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}h`;
    const dest = path.join(BACKUP_DIR, `backup-${stamp}.db`);

    // Usa o backup online do SQLite (não bloqueia o banco)
    db.prepare('VACUUM INTO ?').run(dest);
    console.log(`💾 Backup criado: ${dest}`);

    // Mantém apenas os 20 backups mais recentes
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .sort();
    if (files.length > 20) {
      files.slice(0, files.length - 20).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🗑 Backup antigo removido: ${f}`);
      });
    }
  } catch(e) {
    console.error('❌ Erro no backup:', e.message);
  }
}

// Roda imediatamente no boot e depois a cada 6 horas
checkIntegrity();
runBackup();
setInterval(runBackup, 6 * 60 * 60 * 1000);

// ── MULTER ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `dish_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(file.mimetype);
    cb(ok ? null : new Error('Apenas imagens JPG/PNG/WEBP'), ok);
  },
});

// ── MIDDLEWARE ───────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao admin' });
  next();
}

function canEdit(req, res, next) {
  if (!['admin','gerente'].includes(req.user.role))
    return res.status(403).json({ error: 'Sem permissão para editar' });
  next();
}

// ── ACTIVITY LOG HELPER ─────────────────────────────
function logActivity(userId, userName, action, target, details) {
  db.prepare('INSERT INTO activity_log (user_id, user_name, action, target, details) VALUES (?,?,?,?,?)')
    .run(userId, userName, action, target, details || null);
}

// ── SANITIZE (XSS prevention) ───────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── KEEP-ALIVE ──────────────────────────────────────
setInterval(() => {
  const http = require('http');
  const https = require('https');
  const client = APP_URL.startsWith('https') ? https : http;
  client.get(`${APP_URL}/api/ping`, () => {}).on('error', () => {});
}, 14 * 60 * 1000);

app.get('/api/ping', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ══════════════════════════════════════════════════════
//  3. ENDPOINTS DE BACKUP (só admin)
// ══════════════════════════════════════════════════════

// Baixar o banco atual
app.get('/api/admin/backup/download', auth, adminOnly, (req, res) => {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g,'-').slice(0,16);
    const tmpFile = path.join(BACKUP_DIR, `download-${stamp}.db`);
    db.prepare('VACUUM INTO ?').run(tmpFile);
    res.download(tmpFile, `receituario-backup-${stamp}.db`, err => {
      if (!err) fs.unlink(tmpFile, () => {});
    });
    logActivity(req.user.id, req.user.name, 'backup_download', null, 'Download manual do banco');
  } catch(e) {
    res.status(500).json({ error: 'Erro ao gerar backup: ' + e.message });
  }
});

// Listar backups automáticos disponíveis
app.get('/api/admin/backup/list', auth, adminOnly, (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .sort().reverse()
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, date: stat.mtime };
      });
    res.json(files);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Baixar um backup específico
app.get('/api/admin/backup/download/:filename', auth, adminOnly, (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename.startsWith('backup-') || !filename.endsWith('.db')) {
    return res.status(400).json({ error: 'Arquivo inválido' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Backup não encontrado' });
  res.download(filepath, filename);
});

// Status geral do banco (para diagnóstico)
app.get('/api/admin/backup/status', auth, adminOnly, (req, res) => {
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get();
    const counts = {
      usuarios:     db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      pratos:       db.prepare('SELECT COUNT(*) as c FROM dishes').get().c,
      receitas:     db.prepare('SELECT COUNT(*) as c FROM recipes').get().c,
      ingredientes: db.prepare('SELECT COUNT(*) as c FROM ingredients').get().c,
      atividades:   db.prepare('SELECT COUNT(*) as c FROM activity_log').get().c,
    };
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .sort().reverse();
    const dbStat = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
    res.json({
      integrity: integrity?.integrity_check,
      db_size_kb: dbStat ? Math.round(dbStat.size / 1024) : 0,
      counts,
      total_backups: backups.length,
      ultimo_backup: backups[0] || null,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════
//  SYNC — endpoint para clientes verificarem atualizações
// ══════════════════════════════════════════════════════
app.get('/api/sync', auth, (req, res) => {
  const since = req.query.since || '2000-01-01';
  const serverNow = new Date().toISOString();

  const lastDish     = db.prepare("SELECT MAX(updated_at) as t FROM dishes").get();
  const lastRecipe   = db.prepare("SELECT MAX(updated_at) as t FROM recipes").get();
  const lastActivity = db.prepare("SELECT MAX(created_at) as t FROM activity_log").get();

  const latest = [lastDish?.t, lastRecipe?.t, lastActivity?.t]
    .filter(Boolean).sort().pop() || since;

  const needsRefresh = latest > since;
  res.json({ needsRefresh, latest, serverNow });
});

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Dados incompletos' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const token = jwt.sign({ id: user.id, name: user.name, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  logActivity(user.id, user.name, 'login', null, null);
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ══════════════════════════════════════════════════════
//  USER ROUTES (admin only)
// ══════════════════════════════════════════════════════
app.get('/api/users', auth, adminOnly, (_, res) => {
  const users = db.prepare('SELECT id, name, username, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (!['admin', 'gerente', 'operador'].includes(role)) return res.status(400).json({ error: 'Perfil inválido' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)')
      .run(name.trim(), username.trim().toLowerCase(), hash, role);
    logActivity(req.user.id, req.user.name, 'criar_usuario', name, `Perfil: ${role}`);
    res.json({ id: result.lastInsertRowid, name, username, role });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Usuário já existe' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', auth, adminOnly, (req, res) => {
  const { name, password, role } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const newName = name || user.name;
  const newRole = role || user.role;
  const newPass = password ? bcrypt.hashSync(password, 10) : user.password;

  db.prepare('UPDATE users SET name=?, password=?, role=? WHERE id=?').run(newName, newPass, newRole, user.id);
  logActivity(req.user.id, req.user.name, 'editar_usuario', newName, null);
  res.json({ ok: true });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Não pode excluir a si mesmo' });
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.name, 'excluir_usuario', user?.name, null);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  DISH ROUTES
// ══════════════════════════════════════════════════════

// List all dishes with recipe status + author info
app.get('/api/dishes', auth, (_, res) => {
  const dishes = db.prepare(`
    SELECT d.*,
      CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_recipe,
      u_created.name as created_by_name,
      u_updated.name as updated_by_name,
      r.updated_at as recipe_updated_at,
      r_author.name as recipe_author_name,
      r_updater.name as recipe_updater_name,
      r.created_at as recipe_created_at
    FROM dishes d
    LEFT JOIN recipes r ON r.dish_id = d.id
    LEFT JOIN users u_created ON u_created.id = d.created_by
    LEFT JOIN users u_updated ON u_updated.id = d.updated_by
    LEFT JOIN users r_author ON r_author.id = r.created_by
    LEFT JOIN users r_updater ON r_updater.id = r.updated_by
    ORDER BY d.category, d.name
  `).all();
  res.json(dishes);
});

// Get single dish with recipe
app.get('/api/dishes/:id', auth, (req, res) => {
  const dish = db.prepare(`
    SELECT d.*,
      u_created.name as created_by_name,
      u_updated.name as updated_by_name
    FROM dishes d
    LEFT JOIN users u_created ON u_created.id = d.created_by
    LEFT JOIN users u_updated ON u_updated.id = d.updated_by
    WHERE d.id = ?
  `).get(req.params.id);
  if (!dish) return res.status(404).json({ error: 'Prato não encontrado' });

  const recipe = db.prepare(`
    SELECT r.*,
      u_created.name as created_by_name,
      u_updated.name as updated_by_name
    FROM recipes r
    LEFT JOIN users u_created ON u_created.id = r.created_by
    LEFT JOIN users u_updated ON u_updated.id = r.updated_by
    WHERE r.dish_id = ?
  `).get(dish.id);

  if (recipe) {
    recipe.modo = JSON.parse(recipe.modo || '[]');
    recipe.ingredientes = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY ordem').all(recipe.id);
  }
  res.json({ ...dish, recipe: recipe || null });
});

// Create dish
app.post('/api/dishes', auth, canEdit, (req, res) => {
  const { name, category, emoji } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'Nome e categoria obrigatórios' });

  const result = db.prepare('INSERT INTO dishes (name, category, emoji, created_by, updated_by) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), category.trim(), emoji || '🍽️', req.user.id, req.user.id);
  logActivity(req.user.id, req.user.name, 'criar_prato', name.trim(), `Categoria: ${category}`);
  res.json({ id: result.lastInsertRowid, name, category, emoji });
});

// Update dish
app.put('/api/dishes/:id', auth, canEdit, (req, res) => {
  const { name, category, emoji } = req.body;
  db.prepare(`UPDATE dishes SET name=COALESCE(?,name), category=COALESCE(?,category), emoji=COALESCE(?,emoji), updated_by=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, category, emoji, req.user.id, req.params.id);
  logActivity(req.user.id, req.user.name, 'editar_prato', name || '(prato)', null);
  res.json({ ok: true });
});

// Delete dish
app.delete('/api/dishes/:id', auth, canEdit, (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (!dish) return res.status(404).json({ error: 'Prato não encontrado' });
  if (dish.photo_url) {
    const file = path.join(UPLOADS_DIR, path.basename(dish.photo_url));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.name, 'excluir_prato', dish.name, null);
  res.json({ ok: true });
});

// Upload photo
app.post('/api/dishes/:id/photo', auth, canEdit, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });

  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (!dish) return res.status(404).json({ error: 'Prato não encontrado' });

  if (dish.photo_url) {
    const old = path.join(UPLOADS_DIR, path.basename(dish.photo_url));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  const photoUrl = `/uploads/${req.file.filename}`;
  db.prepare(`UPDATE dishes SET photo_url=?, updated_by=?, updated_at=datetime('now','localtime') WHERE id=?`).run(photoUrl, req.user.id, dish.id);
  logActivity(req.user.id, req.user.name, 'foto_prato', dish.name, 'Upload de foto');
  res.json({ photo_url: photoUrl });
});

// Delete photo
app.delete('/api/dishes/:id/photo', auth, canEdit, (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (dish?.photo_url) {
    const file = path.join(UPLOADS_DIR, path.basename(dish.photo_url));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    db.prepare(`UPDATE dishes SET photo_url=NULL, updated_by=?, updated_at=datetime('now','localtime') WHERE id=?`).run(req.user.id, dish.id);
    logActivity(req.user.id, req.user.name, 'remover_foto', dish.name, null);
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  RECIPE ROUTES
// ══════════════════════════════════════════════════════
app.post('/api/dishes/:id/recipe', auth, canEdit, (req, res) => {
  const { rendimento, tempo_preparo, tempo_forno, custo, ingredientes, modo, observacoes } = req.body;
  const dishId = parseInt(req.params.id);
  const dishName = db.prepare('SELECT name FROM dishes WHERE id=?').get(dishId)?.name || '';

  const existing = db.prepare('SELECT id FROM recipes WHERE dish_id = ?').get(dishId);

  let recipeId;
  if (existing) {
    db.prepare(`UPDATE recipes SET rendimento=?,tempo_preparo=?,tempo_forno=?,custo=?,modo=?,observacoes=?,updated_by=?,updated_at=datetime('now','localtime') WHERE id=?`)
      .run(rendimento, tempo_preparo, tempo_forno, custo, JSON.stringify(modo || []), observacoes, req.user.id, existing.id);
    recipeId = existing.id;
    db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(recipeId);
    const ingCount = (ingredientes || []).filter(i => i.nome?.trim()).length;
    logActivity(req.user.id, req.user.name, 'editar_receita', dishName, `${ingCount} ingrediente(s) · ${(modo||[]).length} passo(s)`);
  } else {
    const r = db.prepare(`INSERT INTO recipes (dish_id,rendimento,tempo_preparo,tempo_forno,custo,modo,observacoes,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(dishId, rendimento, tempo_preparo, tempo_forno, custo, JSON.stringify(modo || []), observacoes, req.user.id, req.user.id);
    recipeId = r.lastInsertRowid;
    const ingCount = (ingredientes || []).filter(i => i.nome?.trim()).length;
    logActivity(req.user.id, req.user.name, 'criar_receita', dishName, `${ingCount} ingrediente(s) · ${(modo||[]).length} passo(s)`);
  }

  const insertIng = db.prepare('INSERT INTO ingredients (recipe_id,nome,qtd,un,ordem) VALUES (?,?,?,?,?)');
  (ingredientes || []).forEach((ing, i) => {
    if (ing.nome?.trim()) insertIng.run(recipeId, ing.nome.trim(), ing.qtd || '', ing.un || '', i);
  });

  res.json({ ok: true });
});

app.delete('/api/dishes/:id/recipe', auth, canEdit, (req, res) => {
  const dishName = db.prepare('SELECT name FROM dishes WHERE id=?').get(req.params.id)?.name || '';
  const recipe = db.prepare('SELECT id FROM recipes WHERE dish_id = ?').get(req.params.id);
  if (recipe) {
    db.prepare('DELETE FROM recipes WHERE id = ?').run(recipe.id);
    logActivity(req.user.id, req.user.name, 'excluir_receita', dishName, null);
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  ACTIVITY LOG ROUTES
// ══════════════════════════════════════════════════════
app.get('/api/activity', auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare(`
    SELECT * FROM activity_log
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(logs);
});

// ── CATCH ALL → index.html ───────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🐰 Receituário Toca rodando na porta ${PORT}`));
