# 🐰 Receituário — Toca do Coelho

Sistema de receituário digital para o Restaurante Toca do Coelho.

## O que mudou na v2.0

- **Rastreamento de autoria**: toda receita mostra quem criou, quem editou e quando
- **Sincronização automática**: quando alguém salva algo, todos os usuários veem em até 15 segundos
- **Registro de atividades**: aba "📋 Atividades" no painel admin mostra tudo que aconteceu
- **Segurança**: proteção contra XSS, sanitização de inputs
- **Arquivos corrigidos**: manifest.json, index.html e ícones no lugar certo
- **PWA funcional**: manifest correto para instalação no celular

## Deploy no Railway

1. Faça push deste repositório no GitHub
2. Conecte ao Railway
3. Defina variáveis de ambiente:
   - `JWT_SECRET` = uma chave secreta forte
   - `ADMIN_PASS` = senha do admin (padrão: toca2024)
4. Deploy!

## Estrutura

```
├── public/
│   ├── index.html        ← Frontend (HTML + CSS + JS)
│   ├── manifest.json     ← PWA manifest
│   ├── icon-192.png
│   ├── icon-512.png
│   └── banner.png
├── server.js             ← API Express
├── database.js           ← SQLite + migrations + seeds
├── package.json
└── railway.toml
```

## Login padrão

- Usuário: `admin`
- Senha: `toca2024` (ou o valor de `ADMIN_PASS`)
