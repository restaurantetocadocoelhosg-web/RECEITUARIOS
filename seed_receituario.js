// Script para rodar UMA VEZ no Railway via console
// Apaga tudo errado e insere os pratos certos com receitas

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : __dirname;
const DB_PATH = path.join(DATA_DIR, 'data.db');
const db = new Database(DB_PATH);

console.log('🗑 Limpando pratos errados...');
db.prepare('DELETE FROM ingredients').run();
db.prepare('DELETE FROM recipes').run();
db.prepare('DELETE FROM dishes').run();
db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('dishes','recipes','ingredients')").run();

// Pega o id do admin para autoria
const admin = db.prepare("SELECT id, name FROM users WHERE role='admin' LIMIT 1").get();
const uid = admin?.id || 1;
const uname = admin?.name || 'Administrador';
console.log(`✅ Usando autoria: ${uname} (id ${uid})`);

const now = "datetime('now','localtime')";

function insertDish(name, category, emoji) {
  const r = db.prepare(`INSERT INTO dishes (name, category, emoji, created_by, updated_by, created_at, updated_at) VALUES (?,?,?,?,?,${now},${now})`)
    .run(name, category, emoji, uid, uid);
  return r.lastInsertRowid;
}

function insertRecipe(dishId, { rendimento, tempo_preparo, tempo_forno, custo, ingredientes, modo, observacoes }) {
  const r = db.prepare(`INSERT INTO recipes (dish_id, rendimento, tempo_preparo, tempo_forno, custo, modo, observacoes, created_by, updated_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,${now},${now})`)
    .run(dishId, rendimento||null, tempo_preparo||null, tempo_forno||null, custo||null, JSON.stringify(modo||[]), observacoes||null, uid, uid);
  const recipeId = r.lastInsertRowid;
  const ins = db.prepare('INSERT INTO ingredients (recipe_id, nome, qtd, un, ordem) VALUES (?,?,?,?,?)');
  (ingredientes||[]).forEach((ig, i) => ins.run(recipeId, ig.nome, ig.qtd||'', ig.un||'', i));
  return recipeId;
}

const dishes = [];

// ══════════════════════════════════════════
// MOLHOS E CALDOS
// ══════════════════════════════════════════
let id;

id = insertDish('Molho Madeira', 'Molhos e Caldos', '🍷');
insertRecipe(id, {
  rendimento: 'Aprox. 3L',
  tempo_preparo: '20 min',
  tempo_forno: '40-60 min (redução)',
  ingredientes: [
    {nome:'Pontas de carne', qtd:'2', un:'kg'},
    {nome:'Folha de louro', qtd:'6', un:'un'},
    {nome:'Cebola grande com casca', qtd:'2', un:'un'},
    {nome:'Cenoura com casca', qtd:'2', un:'un'},
    {nome:'Alecrim', qtd:'4', un:'talhos'},
    {nome:'Farinha de trigo', qtd:'500', un:'g'},
    {nome:'Manteiga', qtd:'1', un:'col'},
    {nome:'Açúcar', qtd:'2', un:'col'},
    {nome:'Alho batido', qtd:'3', un:'col'},
    {nome:'Vinho tinto seco', qtd:'500', un:'ml'},
    {nome:'Shoyu', qtd:'300', un:'ml'},
    {nome:'Água', qtd:'1,2', un:'L'},
  ],
  modo: [
    'Em uma panela, adicione a manteiga e leve ao fogo médio.',
    'Higienize a cebola, retire apenas o talo e corte em 4 partes mantendo a casca.',
    'Acrescente à panela: cebola, cenoura em rodelas, louro e alecrim. Refogue até dourar bem.',
    'Afaste os legumes para as laterais. No centro, adicione o açúcar e deixe formar leve caramelo.',
    'Acrescente as pontas de carne e deixe tostar bem.',
    'Adicione o vinho tinto aos poucos, raspando o fundo da panela.',
    'Acrescente o shoyu e misture.',
    'Dissolva o trigo em 1,2L de água e adicione à panela.',
    'Cozinhe em fogo médio por 40 a 60 minutos até reduzir e concentrar.',
    'Finalize coando o caldo.',
  ],
});

id = insertDish('Molho Branco', 'Molhos e Caldos', '🥛');
insertRecipe(id, {
  rendimento: 'Aprox. 3,5L',
  tempo_preparo: '30 min',
  ingredientes: [
    {nome:'Leite integral', qtd:'3', un:'L'},
    {nome:'Cebola em pétalas', qtd:'½', un:'un'},
    {nome:'Folha de louro', qtd:'3', un:'un'},
    {nome:'Manteiga', qtd:'1½', un:'col grande'},
    {nome:'Noz-moscada', qtd:'1', un:'col sobremesa'},
    {nome:'Farinha de trigo', qtd:'300', un:'g'},
    {nome:'Água', qtd:'500', un:'ml'},
    {nome:'Requeijão cremoso', qtd:'1', un:'col grande'},
    {nome:'Sal', qtd:'a gosto', un:''},
  ],
  modo: [
    'Coloque o leite em uma panela grande. Acrescente a cebola em pétalas e o louro.',
    'Leve ao fogo médio até começar a aquecer. Desligue e reserve para infusionar.',
    'Em outra panela, derreta a manteiga. Acrescente a farinha e mexa constantemente até formar pasta homogênea. Cozinhe 2-3 minutos.',
    'Coe o leite e acrescente aos poucos na mistura, mexendo sem parar para não empelotar.',
    'Continue mexendo até engrossar. Acrescente a água para ajustar textura.',
    'Adicione noz-moscada e sal a gosto.',
    'Finalize com o requeijão. Cozinhe mais alguns minutos até atingir consistência desejada.',
  ],
});

id = insertDish('Abacaxi em Calda (para Lombo)', 'Molhos e Caldos', '🍍');
insertRecipe(id, {
  tempo_preparo: '20 min',
  ingredientes: [
    {nome:'Abacaxi grande picado', qtd:'1', un:'un'},
    {nome:'Açúcar', qtd:'a gosto', un:''},
    {nome:'Água (se necessário)', qtd:'', un:''},
  ],
  modo: [
    'Coloque o açúcar na panela em fogo médio. Deixe derreter sem mexer no início.',
    'Se necessário, acrescente um pouco de água para ajustar a textura.',
    'Mexa delicadamente até formar caramelo dourado (não deixe escurecer).',
    'Adicione o abacaxi picado com cuidado — vai soltar bastante líquido.',
    'Misture bem e deixe cozinhar por cerca de 15 minutos.',
  ],
});

id = insertDish('Alho Batido (base para temperos)', 'Molhos e Caldos', '🧄');
insertRecipe(id, {
  rendimento: '2kg por dia',
  tempo_preparo: '15 min',
  ingredientes: [
    {nome:'Alho descascado', qtd:'1', un:'kg'},
    {nome:'Água (para cobrir)', qtd:'suficiente', un:''},
  ],
  modo: [
    'Coloque o alho descascado no liquidificador.',
    'Adicione água até cobrir todo o alho, deixando cerca de 1 dedo acima.',
    'Bata até triturar bem e formar mistura picotada.',
    'Pare, misture com uma colher e bata novamente rapidamente.',
    'Coar a água e reservar para outras receitas.',
  ],
  observacoes: 'Produção de 2kg por dia. A água coada pode ser usada como "água de alho" em outros temperos.',
});

// ══════════════════════════════════════════
// PROTEÍNA BOVINA
// ══════════════════════════════════════════

id = insertDish('Costela Gaúcha', 'Proteína Bovina', '🥩');
insertRecipe(id, {
  rendimento: '5kg de costela',
  tempo_preparo: '20 min',
  tempo_forno: '30-40 min (pressão)',
  ingredientes: [
    {nome:'Costela bovina', qtd:'5', un:'kg'},
    {nome:'Caldo de carne', qtd:'120', un:'g'},
    {nome:'Colorau', qtd:'50', un:'g'},
    {nome:'Água de alho batido', qtd:'a gosto', un:''},
    {nome:'Alho batido', qtd:'2', un:'col sopa'},
    {nome:'Cebola grande', qtd:'2', un:'un'},
    {nome:'Tomate', qtd:'2', un:'un'},
    {nome:'Cenoura com casca', qtd:'2', un:'un'},
    {nome:'Folha de louro', qtd:'4', un:'un'},
    {nome:'Óleo', qtd:'suficiente', un:''},
    {nome:'Açúcar', qtd:'1', un:'col grande'},
  ],
  modo: [
    'Tempere a costela: em recipiente grande coloque a carne. Acrescente caldo de carne, colorau, água de alho e alho batido. Massageie bem e deixe descansar pelo menos 15 minutos.',
    'Em panela grande, aqueça o óleo. Refogue cebola, cenoura e alho até dourar.',
    'Acrescente o tomate e deixe murchar. Adicione as folhas de louro.',
    'Abra o refogado no meio da panela. No centro, coloque o açúcar e deixe formar caramelo escuro.',
    'Coloque a costela temperada sobre o refogado e misture levemente.',
    'Acrescente água até quase cobrir a carne.',
    'Cozinhe em pressão por 30 a 40 minutos até a costela ficar bem macia.',
  ],
});

id = insertDish('Carne Assada ao Molho Madeira', 'Proteína Bovina', '🥩');
insertRecipe(id, {
  observacoes: 'Usar o Molho Madeira da casa. Prato presente nas bancadas de rechaud redondo.',
});

id = insertDish('Picadinho do Zeca', 'Proteína Bovina', '🥩');
insertRecipe(id, {
  observacoes: 'Prato principal da quarta-feira.',
});

id = insertDish('Medalhão de Frango', 'Proteína Bovina', '🥩');
insertRecipe(id, {
  observacoes: 'Prato da quarta-feira.',
});

id = insertDish('Bife a Rolê', 'Proteína Bovina', '🥩');
insertRecipe(id, {
  observacoes: 'Prato da sexta-feira.',
});

id = insertDish('Cupim', 'Proteína Bovina', '🥩');
insertRecipe(id, {
  observacoes: 'Prato do domingo — rechaud redondo.',
});

// ══════════════════════════════════════════
// PROTEÍNA AVE
// ══════════════════════════════════════════

id = insertDish('Frango Assado', 'Proteína Ave', '🍗');
insertRecipe(id, {
  rendimento: 'Dia comum: 20 peças (5 pacotes) / Final de semana: conforme demanda',
  tempo_forno: '1 hora a 180°–200°C',
  ingredientes: [
    {nome:'Coxa e sobrecoxa', qtd:'conforme produção', un:''},
    {nome:'Água de alho', qtd:'500', un:'ml'},
    {nome:'Alho batido', qtd:'2', un:'col sopa'},
    {nome:'Colorau', qtd:'50', un:'g'},
    {nome:'Caldo de galinha', qtd:'110', un:'g'},
    {nome:'Óleo', qtd:'100', un:'ml'},
  ],
  modo: [
    'Limpar e preparar o frango (retirar pezinho e excesso de pele).',
    'Misturar em recipiente: água de alho, alho batido, colorau, caldo de galinha e óleo.',
    'Colocar o frango na assadeira e despejar o tempero por cima. Misturar bem.',
    'Se possível, deixar marinar por 15 minutos.',
    'Levar ao forno pré-aquecido a 180°–200°C.',
    'Assar por aproximadamente 1 hora até dourar bem.',
    'Se necessário, virar na metade do tempo para dourar por igual.',
  ],
});

id = insertDish('Frango Grelhado', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Presente em vários cardápios semanais.',
});

id = insertDish('Strogonoff de Frango', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato da segunda-feira.',
});

id = insertDish('Frango Ensopado com Quiabo', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato da sexta-feira.',
});

id = insertDish('Parmegiana de Frango', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato da quinta-feira.',
});

id = insertDish('Filé de Frango à Milanesa', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato recorrente na semana.',
});

id = insertDish('Fricassê de Frango', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato da quinta-feira — rechaud retangular.',
});

id = insertDish('Frango Assado no Alho Poró', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato do domingo — rechaud redondo.',
});

id = insertDish('Frango Surprise', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato do sábado.',
});

id = insertDish('Frango com Quiabo', 'Proteína Ave', '🍗');
insertRecipe(id, {
  observacoes: 'Prato da quarta-feira.',
});

// ══════════════════════════════════════════
// PROTEÍNA SUÍNA
// ══════════════════════════════════════════

id = insertDish('Costelinha Suína Assada ou Grelhada no Limão', 'Proteína Suína', '🐖');
insertRecipe(id, {
  observacoes: 'Prato da terça-feira — rechaud redondo.',
});

id = insertDish('Costelinha Suína com Barbecue', 'Proteína Suína', '🐖');
insertRecipe(id, {
  observacoes: 'Prato da sexta-feira — rechaud redondo.',
});

id = insertDish('Pernil Assado ao Molho da Casa', 'Proteína Suína', '🐖');
insertRecipe(id, {
  observacoes: 'Prato da quinta-feira — rechaud redondo.',
});

id = insertDish('Isca de Lombo na Cebola Rocha', 'Proteína Suína', '🐖');
insertRecipe(id, {
  observacoes: 'Prato da quinta-feira.',
});

id = insertDish('Costelinha com Molhos', 'Proteína Suína', '🐖');
insertRecipe(id, {
  observacoes: 'Prato do domingo — rechaud retangular.',
});

// ══════════════════════════════════════════
// PEIXE / FRUTOS DO MAR
// ══════════════════════════════════════════

id = insertDish('Filé de Peixe a Dore com Molho Tártaro', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato recorrente na semana — rechaud redondo.',
});

id = insertDish('Filé de Peixe à Portuguesa', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato da quarta-feira — rechaud redondo.',
});

id = insertDish('Moqueca de Peixe ao Molho Branco', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato da quinta-feira.',
});

id = insertDish('Bacalhau à Portuguesa', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato da sexta-feira — rechaud retangular.',
});

id = insertDish('Gratinado de Bacalhau', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato do sábado — rechaud redondo.',
});

id = insertDish('Moqueca de Peixe com Frutos do Mar', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato do sábado — rechaud redondo.',
});

id = insertDish('Risoto de Frutos do Mar', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  observacoes: 'Prato da terça-feira.',
});

id = insertDish('Camarão na Moranga', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  observacoes: 'Prato do domingo.',
});

id = insertDish('Camarão à Paulista', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  observacoes: 'Prato do sábado.',
});

id = insertDish('Torta Trançada de Camarão com Alho Poró', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  tempo_forno: '15 min massa + finalização',
  ingredientes: [
    {nome:'Manteiga (massa)', qtd:'100', un:'g'},
    {nome:'Farinha de trigo (massa)', qtd:'500', un:'g'},
    {nome:'Creme de leite (massa)', qtd:'1', un:'cx'},
    {nome:'Alho poró', qtd:'400', un:'g'},
    {nome:'Camarão', qtd:'300', un:'g'},
    {nome:'Leite', qtd:'300', un:'ml'},
    {nome:'Caldo de frutos do mar', qtd:'1', un:'col'},
    {nome:'Manteiga (recheio)', qtd:'1', un:'col'},
    {nome:'Farinha de trigo (recheio)', qtd:'1', un:'col'},
    {nome:'Mussarela ralada', qtd:'150', un:'g'},
    {nome:'Requeijão', qtd:'1', un:'col'},
  ],
  modo: [
    'Para a massa: misture a manteiga e a farinha até desgrudar da mão. Acrescente o creme de leite até ficar homogênea.',
    'Forre o fundo e as laterais da forma de fundo removível e asse por 15 minutos.',
    'Para o recheio: refogue o camarão na manteiga com o tempero.',
    'Acrescente o alho poró, o leite e o trigo aos poucos para criar textura firme.',
    'Acrescente o requeijão e o queijo.',
    'Despeje na forma em cima da massa já assada.',
    'Crie tranças para a tampa. Volte ao forno e termine de assar.',
  ],
});

id = insertDish('Panqueca de Camarão ao Molho de Maracujá', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  observacoes: 'Prato do sábado — rechaud retangular.',
});

id = insertDish('Lasanha de Camarão', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  observacoes: 'Prato da sexta-feira — rechaud retangular.',
});

id = insertDish('Nhoque de Camarão ou Frutos do Mar', 'Peixe / Frutos do Mar', '🦐');
insertRecipe(id, {
  observacoes: 'Prato da sexta-feira — rechaud retangular.',
});

id = insertDish('Frutos do Mar', 'Peixe / Frutos do Mar', '🦞');
insertRecipe(id, {
  observacoes: 'Prato do domingo — rechaud redondo.',
});

id = insertDish('Polvo à Lagareiro', 'Peixe / Frutos do Mar', '🐙');
insertRecipe(id, {
  observacoes: 'Prato do domingo.',
});

id = insertDish('Gurjão de Peixe Crocante / Pirão', 'Peixe / Frutos do Mar', '🐟');
insertRecipe(id, {
  observacoes: 'Prato do sábado.',
});

// ══════════════════════════════════════════
// ACOMPANHAMENTOS
// ══════════════════════════════════════════

id = insertDish('Arroz Branco', 'Acompanhamento', '🍚');
insertRecipe(id, {
  rendimento: '4kg de arroz',
  ingredientes: [
    {nome:'Arroz', qtd:'4', un:'kg'},
    {nome:'Alho batido', qtd:'200', un:'g'},
    {nome:'Folha de louro', qtd:'4', un:'un'},
    {nome:'Água', qtd:'10', un:'L'},
    {nome:'Sal', qtd:'a gosto', un:''},
  ],
  modo: [
    'Tempere a água com alho, louro e sal. Deixe ferver.',
    'Acrescente o arroz.',
    'Aguarde a água secar. Um pouco antes de terminar, retire a panela do fogo.',
    'Escorra num escorredor grande.',
    'Abra um buraco no meio do arroz para esfriar.',
  ],
});

id = insertDish('Arroz Integral', 'Acompanhamento', '🍚');
insertRecipe(id, { observacoes: 'Presente diariamente no buffet.' });

id = insertDish('Arroz Verde', 'Acompanhamento', '🍚');
insertRecipe(id, { observacoes: 'Prato da sexta e domingo.' });

id = insertDish('Arroz a Grega', 'Acompanhamento', '🍚');
insertRecipe(id, { observacoes: 'Prato do sábado.' });

id = insertDish('Feijão Preto', 'Acompanhamento', '🫘');
insertRecipe(id, { observacoes: 'Presente diariamente no buffet.' });

id = insertDish('Feijão Carioca / Vermelho', 'Acompanhamento', '🫘');
insertRecipe(id, { observacoes: 'Presente diariamente no buffet.' });

id = insertDish('Feijão Tropeiro', 'Acompanhamento', '🫘');
insertRecipe(id, { observacoes: 'Presente em vários dias.' });

id = insertDish('Feijão Carregado', 'Acompanhamento', '🫘');
insertRecipe(id, { observacoes: 'Prato do sábado.' });

id = insertDish('Feijoada', 'Acompanhamento', '🫘');
insertRecipe(id, { observacoes: 'Presente nas sextas e domingos.' });

id = insertDish('Mocotó / Dobradinha', 'Acompanhamento', '🍲');
insertRecipe(id, { observacoes: 'Presente em vários dias da semana.' });

id = insertDish('Baião de 2', 'Acompanhamento', '🍲');
insertRecipe(id, { observacoes: 'Prato da segunda e terça.' });

id = insertDish('Macarrão Espaguete Alho e Óleo', 'Acompanhamento', '🍝');
insertRecipe(id, { observacoes: 'Presente diariamente no buffet.' });

id = insertDish('Purê de Batata', 'Acompanhamento', '🥔');
insertRecipe(id, { observacoes: 'Presente em vários dias.' });

id = insertDish('Purê Bicolor', 'Acompanhamento', '🥔');
insertRecipe(id, { observacoes: 'Prato da terça e quarta.' });

id = insertDish('Batata Doce Chips', 'Acompanhamento', '🍠');
insertRecipe(id, { observacoes: 'Prato da segunda.' });

id = insertDish('Batata Rústica', 'Acompanhamento', '🥔');
insertRecipe(id, { observacoes: 'Presente em vários dias.' });

id = insertDish('Legumes a Vapor', 'Acompanhamento', '🥦');
insertRecipe(id, { observacoes: 'Prato da quarta.' });

id = insertDish('Legumes Salteados', 'Acompanhamento', '🥦');
insertRecipe(id, { observacoes: 'Presente em vários dias.' });

id = insertDish('Legumes Grelhados', 'Acompanhamento', '🥦');
insertRecipe(id, { observacoes: 'Presente no domingo.' });

id = insertDish('Chuchu com Camarão', 'Acompanhamento', '🥬');
insertRecipe(id, { observacoes: 'Prato da segunda.' });

id = insertDish('Abóbora Refogada', 'Acompanhamento', '🎃');
insertRecipe(id, { observacoes: 'Presente no buffet.' });

id = insertDish('Abobrinha Recheada com Ricota', 'Acompanhamento', '🥒');
insertRecipe(id, { observacoes: 'Prato da segunda e sábado.' });

id = insertDish('Abóbora Refogada no Alho, Cenoura e Palito no Melaço', 'Acompanhamento', '🎃');
insertRecipe(id, { observacoes: 'Prato da quarta.' });

id = insertDish('Cuzcuz Marroquino', 'Acompanhamento', '🫙');
insertRecipe(id, { observacoes: 'Prato da segunda.' });

id = insertDish('Ovos Pochê / Fritos / Gratinados', 'Acompanhamento', '🍳');
insertRecipe(id, { observacoes: 'Presente em vários dias.' });

id = insertDish('Almondegas', 'Acompanhamento', '🍢');
insertRecipe(id, { observacoes: 'Prato da terça.' });

id = insertDish('Carne Moída Refogada com Quiabo', 'Acompanhamento', '🥩');
insertRecipe(id, { observacoes: 'Prato da segunda.' });

id = insertDish('Carne Seca Latilhada', 'Acompanhamento', '🥩');
insertRecipe(id, { observacoes: 'Presente no buffet.' });

id = insertDish('Carne Seca Latilhada na Cebolada e Pimentões Coloridos', 'Acompanhamento', '🥩');
insertRecipe(id, { observacoes: 'Prato do sábado.' });

id = insertDish('Linguiça Mineira', 'Proteína Suína', '🌭');
insertRecipe(id, { observacoes: 'Presente em vários dias.' });

id = insertDish('Linguiça Mineira Acebolada', 'Proteína Suína', '🌭');
insertRecipe(id, { observacoes: 'Prato da quinta.' });

id = insertDish('Linguiça Toscana', 'Proteína Suína', '🌭');
insertRecipe(id, { observacoes: 'Presente no buffet.' });

id = insertDish('Salada Quente de Grão de Bico com Pimentões', 'Salada', '🥗');
insertRecipe(id, { observacoes: 'Prato da quinta.' });

id = insertDish('Rabada com Batata e Agrião', 'Proteína Bovina', '🥩');
insertRecipe(id, { observacoes: 'Prato da sexta e domingo.' });

id = insertDish('Contra Filé Grelhado ou Cupim', 'Proteína Bovina', '🥩');
insertRecipe(id, { observacoes: 'Prato do sábado.' });

id = insertDish('Bifé Grelhado Acebolado', 'Proteína Bovina', '🥩');
insertRecipe(id, { observacoes: 'Prato da segunda.' });

id = insertDish('Costela Bovina com Aipim e Agrião', 'Proteína Bovina', '🥩');
insertRecipe(id, { observacoes: 'Prato da terça — rechaud redondo.' });

id = insertDish('Cordeiro', 'Proteína Bovina', '🥩');
insertRecipe(id, { observacoes: 'Prato do domingo.' });

// ══════════════════════════════════════════
// QUICHE / TORTA / MASSA
// ══════════════════════════════════════════

id = insertDish('Quiche de Cebola e Bacon', 'Quiche / Torta', '🥧');
insertRecipe(id, { observacoes: 'Prato da terça — rechaud retangular.' });

id = insertDish('Quiche', 'Quiche / Torta', '🥧');
insertRecipe(id, { observacoes: 'Prato da quinta — rechaud retangular.' });

id = insertDish('Lasanha de Queijo e Presunto', 'Massa / Nhoque', '🍝');
insertRecipe(id, { observacoes: 'Prato da segunda — rechaud retangular.' });

id = insertDish('Lasanha Bolonhesa', 'Massa / Nhoque', '🍝');
insertRecipe(id, { observacoes: 'Prato da quinta, sábado e domingo.' });

id = insertDish('Panqueca de Frango com Catupiry', 'Massa / Nhoque', '🥞');
insertRecipe(id, { observacoes: 'Prato da segunda — rechaud retangular.' });

id = insertDish('Panqueca', 'Massa / Nhoque', '🥞');
insertRecipe(id, { observacoes: 'Prato da terça e quarta.' });

id = insertDish('Nhoque ao Molho Gorgonzola', 'Massa / Nhoque', '🍝');
insertRecipe(id, { observacoes: 'Prato da quarta.' });

id = insertDish('Nhoque de Aipim', 'Massa / Nhoque', '🍝');
insertRecipe(id, { observacoes: 'Prato da terça.' });

id = insertDish('Canelone / Rondeli', 'Massa / Nhoque', '🍝');
insertRecipe(id, { observacoes: 'Prato da quarta.' });

id = insertDish('Macarrão Talharim', 'Massa / Nhoque', '🍝');
insertRecipe(id, { observacoes: 'Prato da quarta.' });

id = insertDish('Empadão', 'Quiche / Torta', '🥧');
insertRecipe(id, { observacoes: 'Prato da quarta e sábado.' });

id = insertDish('Escondidinho de Aipim com Carne Seca e Cream Cheese', 'Quiche / Torta', '🫙');
insertRecipe(id, { observacoes: 'Prato do domingo.' });

id = insertDish('Role de Abobrinha com Ricota', 'Quiche / Torta', '🥒');
insertRecipe(id, { observacoes: 'Prato da segunda.' });

id = insertDish('Kibe Recheado com Creme de Queijo', 'Quiche / Torta', '🫙');
insertRecipe(id, { observacoes: 'Prato da quinta.' });

// ══════════════════════════════════════════
// SOBREMESA
// ══════════════════════════════════════════

id = insertDish('Pudim de Leite Condensado', 'Sobremesa', '🍮');
insertRecipe(id, {
  tempo_forno: '40 min em banho-maria, temperatura baixa',
  ingredientes: [
    {nome:'Ovos', qtd:'4', un:'un'},
    {nome:'Leite condensado', qtd:'2', un:'cx'},
    {nome:'Leite integral', qtd:'1½ medida da cx', un:''},
    {nome:'Açúcar (calda)', qtd:'6', un:'col sopa'},
  ],
  modo: [
    'Para a calda: na própria forma do pudim, coloque o açúcar e dissolva em fogo até virar caramelo. Reserve.',
    'Bater todos os ingredientes no liquidificador.',
    'Despeje na forma em cima da calda.',
    'Tampe com papel alumínio vedando bem.',
    'Leve ao forno por 40 minutos em banho-maria, temperatura baixa.',
    'Retirar depois de assado e levar à geladeira.',
  ],
});

const total = db.prepare('SELECT COUNT(*) as c FROM dishes').get().c;
const comReceita = db.prepare('SELECT COUNT(*) as c FROM recipes').get().c;
console.log(`✅ Concluído! ${total} pratos inseridos, ${comReceita} com receita.`);
