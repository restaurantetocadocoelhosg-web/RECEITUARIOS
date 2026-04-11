const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
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
    role      TEXT NOT NULL DEFAULT 'viewer', -- 'admin' | 'viewer'
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL,
    emoji      TEXT DEFAULT '🍽️',
    photo_url  TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id      INTEGER NOT NULL UNIQUE REFERENCES dishes(id) ON DELETE CASCADE,
    rendimento   TEXT,
    tempo_preparo TEXT,
    tempo_forno  TEXT,
    custo        TEXT,
    modo         TEXT,  -- JSON array
    observacoes  TEXT,
    updated_by   INTEGER REFERENCES users(id),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    nome      TEXT NOT NULL,
    qtd       TEXT,
    un        TEXT,
    ordem     INTEGER DEFAULT 0
  );
`);

// ── SEED ADMIN ──────────────────────────────────────
function seedAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!exists) {
    const hash = bcrypt.hashSync('toca2024', 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
      .run('Administrador', 'admin', hash, 'admin');
    console.log('✅ Admin criado: usuário=admin senha=toca2024');
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
    { name: 'Nhoque de Frutos do Mar', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Macarrão Talharim', category: 'Massa / Nhoque', emoji: '🍝' },
    { name: 'Escondidinho de Aipim com Carne Seca', category: 'Massa / Nhoque', emoji: '🍲' },
    // Salada
    { name: 'Salada Quente de Grão-de-Bico com Pimentões', category: 'Salada', emoji: '🥗' },
    // Sobremesa
    { name: 'Pudim de Leite Condensado', category: 'Sobremesa', emoji: '🍮' },
    { name: 'Panqueca de Camarão ao Molho de Maracujá', category: 'Sobremesa', emoji: '🥞' },
  ]);

  // Seed recipes for dishes that have them
  seedRecipes();
}

function seedRecipes() {
  const getIdByName = (name) => db.prepare('SELECT id FROM dishes WHERE name = ?').get(name)?.id;
  const insertRecipe = db.prepare(`
    INSERT OR IGNORE INTO recipes (dish_id, rendimento, tempo_preparo, tempo_forno, custo, modo, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertIng = db.prepare(`
    INSERT INTO ingredients (recipe_id, nome, qtd, un, ordem) VALUES (?, ?, ?, ?, ?)
  `);

  const recipes = [
    {
      name: 'Molho Madeira',
      rendimento: 'Caldo base', tempoPreparo: '20 min', tempoForno: '40–60 min', custo: '',
      ingredientes: [
        { nome: 'Pontas de carne', qtd: '2', un: 'kg' },
        { nome: 'Folha de louro', qtd: '6', un: 'un' },
        { nome: 'Cebola grande com casca', qtd: '2', un: 'un' },
        { nome: 'Cenoura grande com casca', qtd: '2', un: 'un' },
        { nome: 'Talhos de alecrim', qtd: '4', un: 'un' },
        { nome: 'Farinha de trigo', qtd: '500', un: 'g' },
        { nome: 'Manteiga', qtd: '1', un: 'col sopa' },
        { nome: 'Açúcar', qtd: '2', un: 'col sopa' },
        { nome: 'Alho batido', qtd: '3', un: 'col sopa' },
        { nome: 'Vinho tinto seco', qtd: '500', un: 'ml' },
        { nome: 'Shoyu', qtd: '300', un: 'ml' },
        { nome: 'Água', qtd: '1,2', un: 'L' },
      ],
      modo: [
        'Em uma panela, adicione a manteiga e leve ao fogo médio.',
        'Higienize bem a cebola, retire apenas o talo e corte em 4 partes mantendo a casca. Acrescente à panela: cebola, cenoura em rodelas, folha de louro e alecrim. Deixe refogar até dourar bem.',
        'Afaste os legumes para as laterais. No centro, adicione o açúcar e deixe derreter até formar um leve caramelo.',
        'Acrescente as pontas de carne e deixe tostar bem, criando sabor no fundo.',
        'Adicione o vinho tinto aos poucos, raspando o fundo para soltar todo o sabor.',
        'Acrescente o shoyu e misture.',
        'Dissolva o trigo nos 1,2 L de água e adicione à panela.',
        'Deixe ferver em fogo médio por 40–60 minutos até reduzir e concentrar.',
        'Finalize coando o caldo.',
      ],
      observacoes: '',
    },
    {
      name: 'Molho Branco',
      rendimento: 'Caldo base', tempoPreparo: '15 min', tempoForno: '', custo: '',
      ingredientes: [
        { nome: 'Leite', qtd: '3', un: 'L' },
        { nome: 'Cebola em pétalas', qtd: '½', un: 'un' },
        { nome: 'Folhas de louro', qtd: '3', un: 'un' },
        { nome: 'Manteiga', qtd: '1½', un: 'col sopa' },
        { nome: 'Noz-moscada', qtd: '1', un: 'col sobremesa' },
        { nome: 'Farinha de trigo', qtd: '300', un: 'g' },
        { nome: 'Água', qtd: '500', un: 'ml' },
        { nome: 'Requeijão cremoso', qtd: '1', un: 'col sopa' },
        { nome: 'Sal', qtd: 'a gosto', un: '' },
      ],
      modo: [
        'Em uma panela grande, coloque o leite com a cebola em pétalas e folhas de louro. Leve ao fogo médio até aquecer (não ferver). Desligue e deixe infusionar.',
        'Em outra panela, derreta a manteiga. Acrescente a farinha e mexa por 2–3 minutos até formar pasta homogênea.',
        'Coe o leite e acrescente aos poucos na pasta de manteiga, mexendo sem parar para não empelotar.',
        'Continue até engrossar. Acrescente a água para ajustar textura.',
        'Adicione noz-moscada e sal. Finalize com o requeijão cremoso.',
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
      name: 'Abacaxi em Calda (para Lombo)',
      rendimento: 'Acompanha lombo', tempoPreparo: '5 min', tempoForno: '15 min', custo: '',
      ingredientes: [
        { nome: 'Açúcar', qtd: 'a gosto', un: '' },
        { nome: 'Abacaxi grande picado', qtd: '1', un: 'un' },
        { nome: 'Água (se necessário)', qtd: 'um pouco', un: '' },
      ],
      modo: [
        'Coloque o açúcar na panela em fogo médio. Deixe derreter sem mexer no início.',
        'Se necessário, acrescente um pouco de água. Mexa até formar caramelo dourado.',
        'Adicione o abacaxi picado com cuidado (solta bastante líquido).',
        'Misture bem e cozinhe por 15 minutos.',
      ],
      observacoes: '',
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
      name: 'Torta Trançada de Camarão com Alho-Poró',
      rendimento: '1 forma grande', tempoPreparo: '20 min', tempoForno: '15 min massa + 25 min recheio', custo: '',
      ingredientes: [
        { nome: 'Manteiga (massa)', qtd: '100', un: 'g' },
        { nome: 'Farinha de trigo (massa)', qtd: '500', un: 'g' },
        { nome: 'Creme de leite (massa)', qtd: '1', un: 'cx' },
        { nome: 'Alho-poró', qtd: '400', un: 'g' },
        { nome: 'Camarão', qtd: '300', un: 'g' },
        { nome: 'Leite', qtd: '300', un: 'ml' },
        { nome: 'Caldo de frutos do mar', qtd: '1', un: 'col' },
        { nome: 'Manteiga (recheio)', qtd: '1', un: 'col' },
        { nome: 'Farinha de trigo (recheio)', qtd: '1', un: 'col' },
        { nome: 'Mussarela ralada', qtd: '150', un: 'g' },
        { nome: 'Requeijão', qtd: '1', un: 'col' },
      ],
      modo: [
        'Massa: misture manteiga e farinha até desgrudar. Acrescente creme de leite até formar massa homogênea.',
        'Forre fundo e laterais de forma de fundo removível. Asse por 15 minutos.',
        'Recheio: refogue o camarão na manteiga com caldo de frutos do mar.',
        'Acrescente alho-poró, leite e farinha aos poucos para criar textura firme.',
        'Acrescente requeijão e mussarela.',
        'Despeje o recheio sobre a massa assada. Faça tranças de massa para tampar.',
        'Volte ao forno e termine de assar.',
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
