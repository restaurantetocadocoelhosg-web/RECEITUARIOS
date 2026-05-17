const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const fs = require('fs');
const DATA_DIR = '/app/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'data.db');
const db = new Database(DB_PATH);

// Performance
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

// ── MIGRATIONS (add columns if missing) ─────────────
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
safeAddColumn('recipes', 'created_at', "TEXT DEFAULT (datetime('now','localtime'))");
safeAddColumn('recipes', 'updated_by', 'INTEGER REFERENCES users(id)');
try { db.prepare("UPDATE users SET role='operador' WHERE role='viewer'").run(); } catch(e) {}

// ── SEED ADMIN ──────────────────────────────────────
function seedAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!exists) {
    const adminPass = process.env.ADMIN_PASS;
    if (!adminPass) {
      console.warn('⚠️  ADMIN_PASS não definido — seed do admin ignorado. Defina a variável de ambiente para criar o admin inicial.');
      return;
    }
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
      .run('Administrador', 'admin', hash, 'admin');
    console.log('✅ Admin criado');
  }
}

// ── SEED DISHES ─────────────────────────────────────
function seedDishes() {
  const count = db.prepare('SELECT COUNT(*) as c FROM dishes').get().c;
  if (count > 0) return;

  const insert = db.prepare(`INSERT INTO dishes (name, category, emoji) VALUES (?, ?, ?)`);
  const insertMany = db.transaction((dishes) => {
    for (const d of dishes) insert.run(d.name, d.category, d.emoji);
  });

  insertMany([
    // Molhos e Caldos
    { name: 'Molho Madeira', category: 'Molhos e Caldos', emoji: '🫙' },
    { name: 'Molho Branco', category: 'Molhos e Caldos', emoji: '🥛' },
    { name: 'Alho Batido (base)', category: 'Molhos e Caldos', emoji: '🧄' },
    { name: 'Abacaxi em Calda (para Lombo)', category: 'Molhos e Caldos', emoji: '🍍' },
    // Proteína Bovina
    { name: 'Costela Gaúcha', category: 'Proteína Bovina', emoji: '🥩' },
    { name: 'Carne Assada ao Molho Madeira', category: 'Proteína Bovina', emoji: '🥩' },
    { name: 'Picadinho do Zeca', category: 'Proteína Bovina', emoji: '🍲' },
    { name: 'Bife a Rolê', category: 'Proteína Bovina', emoji: '🥩' },
    { name: 'Bife Grelhado Acebolado', category: 'Proteína Bovina', emoji: '🥩' },
    { name: 'Medalhão de Frango', category: 'Proteína Bovina', emoji: '🥩' },
    { name: 'Rabada com Batata e Agrião', category: 'Proteína Bovina', emoji: '🍲' },
    { name: 'Cupim', category: 'Proteína Bovina', emoji: '🥩' },
    // Proteína Ave
    { name: 'Frango Assado', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Frango Grelhado', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Filé de Frango à Milanesa', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Parmegiana de Frango', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Strogonoff de Frango', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Frango Ensopado com Quiabo', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Frango Surprise', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Frango Assado ao Alho-Poró', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Fricassê de Frango', category: 'Proteína Ave', emoji: '🍗' },
    { name: 'Panqueca de Frango com Catupiry', category: 'Proteína Ave', emoji: '🥞' },
    // Proteína Suína
    { name: 'Costelinha Suína com Barbecue', category: 'Proteína Suína', emoji: '🍖' },
    { name: 'Costelinha Suína Frita/Ensopada', category: 'Proteína Suína', emoji: '🍖' },
    { name: 'Costela Suína Assada no Limão', category: 'Proteína Suína', emoji: '🍖' },
    { name: 'Pernil Assado ao Molho da Casa', category: 'Proteína Suína', emoji: '🍖' },
    { name: 'Isca de Lombo na Cebola Rocha', category: 'Proteína Suína', emoji: '🍖' },
    { name: 'Linguiça Mineira', category: 'Proteína Suína', emoji: '🌭' },
    { name: 'Linguiça Mineira Acebolada', category: 'Proteína Suína', emoji: '🌭' },
    { name: 'Linguiça Toscana Grelhada', category: 'Proteína Suína', emoji: '🌭' },
    // Peixe / Frutos do Mar
    { name: 'Filé de Peixe à Belle Munière', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Filé de Peixe à Portuguesa', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Filé de Peixe à Doré', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Peixe ao Molho Tártaro', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Moqueca de Peixe ao Molho Branco', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Bacalhau a Portuguesa', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Bacalhau Gratinado', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    { name: 'Moqueca de Frutos do Mar', category: 'Peixe / Frutos do Mar', emoji: '🦐' },
    { name: 'Camarão na Moranga', category: 'Peixe / Frutos do Mar', emoji: '🦐' },
    { name: 'Camarão a Paulista', category: 'Peixe / Frutos do Mar', emoji: '🦐' },
    { name: 'Chuchu com Camarão', category: 'Peixe / Frutos do Mar', emoji: '🦐' },
    { name: 'Polvo à Lagareiro', category: 'Peixe / Frutos do Mar', emoji: '🐙' },
    { name: 'Risoto de Frutos do Mar', category: 'Peixe / Frutos do Mar', emoji: '🍚' },
    { name: 'Gurjão de Peixe Crocante', category: 'Peixe / Frutos do Mar', emoji: '🐟' },
    // Acompanhamentos
    { name: 'Arroz Branco', category: 'Acompanhamento', emoji: '🍚' },
    { name: 'Arroz Integral', category: 'Acompanhamento', emoji: '🍚' },
    { name: 'Arroz Verde', category: 'Acompanhamento', emoji: '🍚' },
    { name: 'Arroz a Grega', category: 'Acompanhamento', emoji: '🍚' },
    { name: 'Feijão Preto', category: 'Acompanhamento', emoji: '🫘' },
    { name: 'Feijão Carioca / Vermelho', category: 'Acompanhamento', emoji: '🫘' },
    { name: 'Feijão Tropeiro', category: 'Acompanhamento', emoji: '🫘' },
    { name: 'Feijoada', category: 'Acompanhamento', emoji: '🍲' },
    { name: 'Baião de 2', category: 'Acompanhamento', emoji: '🍲' },
    { name: 'Mocotó / Dobradinha', category: 'Acompanhamento', emoji: '🍲' },
    { name: 'Macarrão Espaguete Alho e Óleo', category: 'Acompanhamento', emoji: '🍝' },
    { name: 'Purê de Batata', category: 'Acompanhamento', emoji: '🥔' },
    { name: 'Purê Bicolor', category: 'Acompanhamento', emoji: '🥔' },
    { name: 'Batata Doce Chips', category: 'Acompanhamento', emoji: '🍠' },
    { name: 'Batata Rústica', category: 'Acompanhamento', emoji: '🥔' },
    { name: 'Legumes Salteados', category: 'Acompanhamento', emoji: '🥦' },
    { name: 'Legumes a Vapor', category: 'Acompanhamento', emoji: '🥦' },
    { name: 'Abóbora Refogada', category: 'Acompanhamento', emoji: '🎃' },
    { name: 'Carne Moída Refogada com Quiabo', category: 'Acompanhamento', emoji: '🥬' },
    { name: 'Cuzcuz Marroquino', category: 'Acompanhamento', emoji: '🫙' },
    { name: 'Ovos Poché / Fritos / Gratinados', category: 'Acompanhamento', emoji: '🍳' },
    { name: 'Carne Seca Latilhada', category: 'Acompanhamento', emoji: '🥩' },
    // Quiche / Torta
    { name: 'Torta Trançada de Camarão com Alho-Poró', category: 'Quiche / Torta', emoji: '🥧' },
    { name: 'Quiche de Cebola e Bacon', category: 'Quiche / Torta', emoji: '🥧' },
    { name: 'Quiche', category: 'Quiche / Torta', emoji: '🥧' },
    { name: 'Empadão', category: 'Quiche / Torta', emoji: '🥧' },
    { name: 'Kibe Recheado com Creme de Queijo', category: 'Quiche / Torta', emoji: '🫓' },
    // Massa / Nhoque
    { name: 'Lasanha Bolonhesa', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Lasanha de Queijo e Presunto', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Lasanha (Camarão)', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Canelone / Rondeli', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Nhoque ao Molho Gorgonzola', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Nhoque de Aipim', category: 'Massa / Nhoque', emoji: '🍝' },
    // Salada
    { name: 'Salada Verde (Alface, Rúcula, Agrião)', category: 'Salada', emoji: '🥗' },
    { name: 'Salpicão', category: 'Salada', emoji: '🥗' },
    { name: 'Salada Tropical', category: 'Salada', emoji: '🥗' },
    { name: 'Salada Caesar', category: 'Salada', emoji: '🥗' },
    { name: 'Vinagrete', category: 'Salada', emoji: '🥗' },
    // Sobremesa
    { name: 'Pudim de Leite Condensado', category: 'Sobremesa', emoji: '🍮' },
    { name: 'Mousse de Chocolate', category: 'Sobremesa', emoji: '🍫' },
    { name: 'Mousse de Maracujá', category: 'Sobremesa', emoji: '🍮' },
    { name: 'Bolo de Cenoura', category: 'Sobremesa', emoji: '🍰' },
    { name: 'Bolo de Milho', category: 'Sobremesa', emoji: '🌽' },
    { name: 'Brigadeirão', category: 'Sobremesa', emoji: '🍫' },
    { name: 'Gelatina Colorida', category: 'Sobremesa', emoji: '🟡' },
  ]);

  // ── SEED RECIPES ─────────────────────────────────
  const getIdByName = (n) => {
    const r = db.prepare('SELECT id FROM dishes WHERE name = ?').get(n);
    return r ? r.id : null;
  };
  const insertRecipe = db.prepare(`INSERT OR IGNORE INTO recipes (dish_id,rendimento,tempo_preparo,tempo_forno,custo,modo,observacoes) VALUES (?,?,?,?,?,?,?)`);
  const insertIng = db.prepare('INSERT INTO ingredients (recipe_id,nome,qtd,un,ordem) VALUES (?,?,?,?,?)');

  const recipes = [
    {
      name: 'Molho Madeira',
      rendimento: '2 L', tempoPreparo: '10 min', tempoForno: '30 min', custo: '',
      ingredientes: [
        { nome: 'Manteiga', qtd: '100', un: 'g' },
        { nome: 'Farinha de trigo', qtd: '80', un: 'g' },
        { nome: 'Caldo de carne', qtd: '2', un: 'L' },
        { nome: 'Vinho Madeira', qtd: '200', un: 'ml' },
        { nome: 'Champignon fatiado', qtd: '200', un: 'g' },
        { nome: 'Sal e pimenta', qtd: 'a gosto', un: '' },
      ],
      modo: [
        'Derreta a manteiga, acrescente a farinha e mexa até dourar (roux).',
        'Adicione o caldo de carne aos poucos, mexendo sem parar.',
        'Acrescente o vinho Madeira e o champignon.',
        'Cozinhe por 30 min em fogo baixo até engrossar.',
        'Ajuste sal e pimenta.',
      ],
      observacoes: 'Usar vinho madeira de boa qualidade.',
    },
    {
      name: 'Molho Branco',
      rendimento: '1,5 L', tempoPreparo: '5 min', tempoForno: '15 min', custo: '',
      ingredientes: [
        { nome: 'Manteiga', qtd: '80', un: 'g' },
        { nome: 'Farinha de trigo', qtd: '80', un: 'g' },
        { nome: 'Leite integral', qtd: '1,5', un: 'L' },
        { nome: 'Noz-moscada', qtd: 'a gosto', un: '' },
        { nome: 'Sal', qtd: 'a gosto', un: '' },
      ],
      modo: [
        'Derreta a manteiga em fogo médio.',
        'Adicione a farinha e mexa por 2 minutos.',
        'Acrescente o leite aos poucos, mexendo sempre.',
        'Cozinhe até engrossar. Tempere com noz-moscada e sal.',
      ],
      observacoes: '',
    },
    {
      name: 'Alho Batido (base)',
      rendimento: '2 kg/dia', tempoPreparo: '10 min', tempoForno: '', custo: '',
      ingredientes: [
        { nome: 'Alho descascado', qtd: '1', un: 'kg' },
        { nome: 'Água (até cobrir + 1 dedo)', qtd: 'suficiente', un: '' },
      ],
      modo: [
        'Coloque o alho descascado no liquidificador.',
        'Adicione água até cobrir, deixando 1 dedo acima.',
        'Bata até triturar bem. Pare, misture e bata novamente.',
        'Coar a água (água de alho) e reservar para outras receitas.',
      ],
      observacoes: 'Produção diária: 2 kg. A água coada (água de alho) é base de temperos.',
    },
    {
      name: 'Costela Gaúcha',
      rendimento: '5 kg de costela', tempoPreparo: '15 min', tempoForno: '30–40 min pressão', custo: '',
      ingredientes: [
        { nome: 'Costela bovina', qtd: '5', un: 'kg' },
        { nome: 'Caldo de carne', qtd: '120', un: 'g' },
        { nome: 'Colorau', qtd: '50', un: 'g' },
        { nome: 'Água de alho', qtd: 'um pouco', un: '' },
        { nome: 'Alho batido', qtd: '2', un: 'col sopa' },
        { nome: 'Cebola (pedaços grandes)', qtd: '2', un: 'un' },
        { nome: 'Tomates cortados', qtd: '2', un: 'un' },
        { nome: 'Cenouras com casca em rodelas', qtd: '2', un: 'un' },
        { nome: 'Folhas de louro', qtd: '4', un: 'un' },
        { nome: 'Óleo', qtd: 'suficiente', un: '' },
        { nome: 'Açúcar', qtd: '1', un: 'col sopa' },
      ],
      modo: [
        'Tempere a costela com caldo de carne, colorau, água de alho e alho batido. Massageie bem e deixe descansar 15 min.',
        'Aqueça o óleo. Refogue cebola, cenoura e tomate até dourar. Adicione o louro.',
        'Abra o refogado no centro, adicione o açúcar e deixe caramelizar levemente.',
        'Coloque a costela sobre o refogado e misture levemente.',
        'Adicione água até quase cobrir. Cozinhe na pressão por 30–40 minutos.',
      ],
      observacoes: '',
    },
    {
      name: 'Frango Assado',
      rendimento: 'Dia comum: 20 pçs', tempoPreparo: '15 min + 15 min marinada', tempoForno: '1h a 180–200°C', custo: '',
      ingredientes: [
        { nome: 'Coxa e sobrecoxa', qtd: 'conforme produção', un: '' },
        { nome: 'Água de alho', qtd: '500', un: 'ml' },
        { nome: 'Alho batido', qtd: '2', un: 'col sopa' },
        { nome: 'Colorau', qtd: '50', un: 'g' },
        { nome: 'Caldo de galinha', qtd: '110', un: 'g' },
        { nome: 'Óleo', qtd: '100', un: 'ml' },
      ],
      modo: [
        'Limpar o frango: retirar pezinho e excesso de pele.',
        'Misturar: água de alho, alho batido, colorau, caldo de galinha e óleo.',
        'Colocar o frango na assadeira, despejar o tempero e misturar bem.',
        'Marinar por 15 minutos se possível.',
        'Assar em forno pré-aquecido a 180–200°C por 1 hora até dourar.',
        'Virar na metade do tempo para dourar por igual.',
      ],
      observacoes: '',
    },
    {
      name: 'Pudim de Leite Condensado',
      rendimento: '1 forma grande', tempoPreparo: '15 min', tempoForno: '40 min banho-maria', custo: '',
      ingredientes: [
        { nome: 'Ovos', qtd: '4', un: 'un' },
        { nome: 'Leite condensado', qtd: '2', un: 'cx' },
        { nome: 'Leite integral (1½ medida da cx)', qtd: '~600', un: 'ml' },
        { nome: 'Açúcar (calda)', qtd: '6', un: 'col sopa' },
      ],
      modo: [
        'Calda: na forma do pudim, derreta o açúcar em fogo médio até caramelizar. Reserve.',
        'Bata ovos, leite condensado e leite no liquidificador.',
        'Despeje na forma sobre a calda.',
        'Tampe com papel-alumínio vedado e asse em banho-maria por 40 min em temperatura baixa.',
        'Retire do forno e leve à geladeira até firmar.',
      ],
      observacoes: 'Sirva bem gelado.',
    },
    {
      name: 'Arroz Branco',
      rendimento: '4 kg', tempoPreparo: '5 min', tempoForno: 'Até a água secar', custo: '',
      ingredientes: [
        { nome: 'Arroz', qtd: '4', un: 'kg' },
        { nome: 'Alho batido', qtd: '200', un: 'g' },
        { nome: 'Folhas de louro', qtd: '4', un: 'un' },
        { nome: 'Água', qtd: '10', un: 'L' },
        { nome: 'Sal', qtd: 'a gosto', un: '' },
      ],
      modo: [
        'Tempere a água com alho, louro e sal. Deixe ferver.',
        'Acrescente o arroz.',
        'Aguarde a água secar. Um pouco antes de terminar, retire do fogo.',
        'Escorra em escorredor grande. Abra um buraco no meio para esfriar.',
      ],
      observacoes: '',
    },
  ];

  for (const r of recipes) {
    const dishId = getIdByName(r.name);
    if (!dishId) continue;
    const result = insertRecipe.run(
      dishId, r.rendimento, r.tempoPreparo, r.tempoForno, r.custo,
      JSON.stringify(r.modo), r.observacoes
    );
    if (result.changes > 0) {
      r.ingredientes.forEach((ing, i) => {
        insertIng.run(result.lastInsertRowid, ing.nome, ing.qtd, ing.un, i);
      });
    }
  }
}

seedAdmin();
seedDishes();

module.exports = db;
