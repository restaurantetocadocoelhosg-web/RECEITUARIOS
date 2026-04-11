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

// ── UPLOADS DIR ─────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
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

// ── KEEP-ALIVE (evita o Railway dormir) ─────────────
setInterval(() => {
  const http = require('http');
  const https = require('https');
  const url = APP_URL;
  const client = url.startsWith('https') ? https : http;
  client.get(`${url}/api/ping`, () => {}).on('error', () => {});
}, 14 * 60 * 1000); // a cada 14 minutos

app.get('/api/ping', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Dados incompletos' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const token = jwt.sign({ id: user.id, name: user.name, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
});

// Me
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
  if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Perfil inválido' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)')
      .run(name.trim(), username.trim().toLowerCase(), hash, role);
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
  res.json({ ok: true });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Não pode excluir a si mesmo' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  DISH ROUTES
// ══════════════════════════════════════════════════════

// List all dishes with recipe status
app.get('/api/dishes', auth, (_, res) => {
  const dishes = db.prepare(`
    SELECT d.*, CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_recipe
    FROM dishes d
    LEFT JOIN recipes r ON r.dish_id = d.id
    ORDER BY d.category, d.name
  `).all();
  res.json(dishes);
});

// Get single dish with recipe
app.get('/api/dishes/:id', auth, (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (!dish) return res.status(404).json({ error: 'Prato não encontrado' });

  const recipe = db.prepare('SELECT * FROM recipes WHERE dish_id = ?').get(dish.id);
  if (recipe) {
    recipe.modo = JSON.parse(recipe.modo || '[]');
    recipe.ingredientes = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY ordem').all(recipe.id);
  }
  res.json({ ...dish, recipe: recipe || null });
});

// Create dish
app.post('/api/dishes', auth, adminOnly, (req, res) => {
  const { name, category, emoji } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'Nome e categoria obrigatórios' });

  const result = db.prepare('INSERT INTO dishes (name, category, emoji) VALUES (?, ?, ?)')
    .run(name.trim(), category.trim(), emoji || '🍽️');
  res.json({ id: result.lastInsertRowid, name, category, emoji });
});

// Update dish
app.put('/api/dishes/:id', auth, adminOnly, (req, res) => {
  const { name, category, emoji } = req.body;
  db.prepare(`UPDATE dishes SET name=COALESCE(?,name), category=COALESCE(?,category), emoji=COALESCE(?,emoji), updated_at=datetime('now') WHERE id=?`)
    .run(name, category, emoji, req.params.id);
  res.json({ ok: true });
});

// Delete dish
app.delete('/api/dishes/:id', auth, adminOnly, (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (!dish) return res.status(404).json({ error: 'Prato não encontrado' });
  if (dish.photo_url) {
    const file = path.join(UPLOADS_DIR, path.basename(dish.photo_url));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Upload photo
app.post('/api/dishes/:id/photo', auth, adminOnly, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });

  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (!dish) return res.status(404).json({ error: 'Prato não encontrado' });

  // Delete old photo
  if (dish.photo_url) {
    const old = path.join(UPLOADS_DIR, path.basename(dish.photo_url));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  const photoUrl = `/uploads/${req.file.filename}`;
  db.prepare(`UPDATE dishes SET photo_url=?, updated_at=datetime('now') WHERE id=?`).run(photoUrl, dish.id);
  res.json({ photo_url: photoUrl });
});

// Delete photo
app.delete('/api/dishes/:id/photo', auth, adminOnly, (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (dish?.photo_url) {
    const file = path.join(UPLOADS_DIR, path.basename(dish.photo_url));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    db.prepare(`UPDATE dishes SET photo_url=NULL, updated_at=datetime('now') WHERE id=?`).run(dish.id);
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  RECIPE ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/dishes/:id/recipe', auth, adminOnly, (req, res) => {
  const { rendimento, tempo_preparo, tempo_forno, custo, ingredientes, modo, observacoes } = req.body;
  const dishId = parseInt(req.params.id);

  const existing = db.prepare('SELECT id FROM recipes WHERE dish_id = ?').get(dishId);

  let recipeId;
  if (existing) {
    db.prepare(`UPDATE recipes SET rendimento=?,tempo_preparo=?,tempo_forno=?,custo=?,modo=?,observacoes=?,updated_by=?,updated_at=datetime('now') WHERE id=?`)
      .run(rendimento, tempo_preparo, tempo_forno, custo, JSON.stringify(modo || []), observacoes, req.user.id, existing.id);
    recipeId = existing.id;
    db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(recipeId);
  } else {
    const r = db.prepare(`INSERT INTO recipes (dish_id,rendimento,tempo_preparo,tempo_forno,custo,modo,observacoes,updated_by) VALUES (?,?,?,?,?,?,?,?)`)
      .run(dishId, rendimento, tempo_preparo, tempo_forno, custo, JSON.stringify(modo || []), observacoes, req.user.id);
    recipeId = r.lastInsertRowid;
  }

  const insertIng = db.prepare('INSERT INTO ingredients (recipe_id,nome,qtd,un,ordem) VALUES (?,?,?,?,?)');
  (ingredientes || []).forEach((ing, i) => {
    if (ing.nome?.trim()) insertIng.run(recipeId, ing.nome.trim(), ing.qtd || '', ing.un || '', i);
  });

  res.json({ ok: true });
});

app.delete('/api/dishes/:id/recipe', auth, adminOnly, (req, res) => {
  const recipe = db.prepare('SELECT id FROM recipes WHERE dish_id = ?').get(req.params.id);
  if (recipe) db.prepare('DELETE FROM recipes WHERE id = ?').run(recipe.id);
  res.json({ ok: true });
});

// ── CATCH ALL → index.html ───────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🐰 Receituário Toca rodando na porta ${PORT}`));
