# 🐰 Receituário Toca do Coelho

App de receituário com login, painel admin e sincronização em tempo real.

---

## 🚀 Deploy no Railway — Passo a Passo

### 1. Instale o Git (se não tiver)
https://git-scm.com/downloads

### 2. Crie o repositório local
```bash
cd receituario-toca
git init
git add .
git commit -m "primeiro commit"
```

### 3. Crie um repositório no GitHub
- Acesse https://github.com/new
- Nome: `receituario-toca`
- Clique em "Create repository"
- Copie o link do repositório

### 4. Conecte e suba o código
```bash
git remote add origin https://github.com/SEU_USUARIO/receituario-toca.git
git push -u origin main
```

### 5. No Railway
- Acesse https://railway.app
- Clique em "New Project" → "Deploy from GitHub repo"
- Selecione `receituario-toca`
- Railway detecta automaticamente o Node.js e faz o deploy

### 6. Configure as variáveis de ambiente no Railway
No painel do projeto, vá em "Variables" e adicione:
```
JWT_SECRET=uma-senha-longa-e-segura-aqui-123456
```

### 7. Adicione o banner/logo
- Renomeie sua imagem da Toca do Coelho para `banner.png`
- Coloque dentro da pasta `public/`
- Faça commit e push novamente

### 8. Adicione os ícones PWA
- Crie dois arquivos de ícone (pode ser a logo do coelho):
  - `public/icon-192.png` (192x192 pixels)
  - `public/icon-512.png` (512x512 pixels)
- Faça commit e push

---

## 🔑 Acesso inicial
- **Usuário:** admin
- **Senha:** toca2024

⚠️ Troque a senha do admin após o primeiro acesso no painel admin (⚙️).

---

## 📱 Instalar como app

### iPhone (Safari):
1. Abra o link do Railway no Safari
2. Toque no botão de compartilhar (quadrado com seta)
3. "Adicionar à Tela de Início"
4. Confirme — o ícone aparecerá na tela inicial

### Windows (Chrome/Edge):
1. Abra o link no Chrome ou Edge
2. Clique no ícone de instalar na barra de endereço (ícone de computador com ➕)
3. Clique em "Instalar"
4. O app abrirá como janela própria

---

## 🔄 Keep-alive
O servidor faz uma requisição a si mesmo a cada 14 minutos para evitar que o Railway desligue por inatividade.

---

## 📁 Estrutura
```
receituario-toca/
├── server.js        ← API + servidor Express
├── database.js      ← SQLite (cria banco automaticamente)
├── package.json
├── railway.toml     ← config do Railway
├── .gitignore
├── uploads/         ← fotos dos pratos (criada automaticamente)
└── public/
    ├── index.html   ← frontend completo
    ├── manifest.json ← PWA
    ├── sw.js        ← Service Worker
    ├── banner.png   ← sua foto de abertura
    ├── icon-192.png ← ícone do app
    └── icon-512.png ← ícone do app
```
