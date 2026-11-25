# ProjetoGamodan

Aplicação Angular com API Node.js/Express e MongoDB local.

## Requisitos
- Node.js 20 ou superior
- MongoDB Community Server iniciado localmente
- npm

## 1. Configurar o banco e a API

Abra um terminal:

```bash
cd steam-backend
npm install
```

Copie `.env.example` para `.env` e ajuste se necessário. Para MongoDB local, o padrão é:

```env
PORT=3000
FRONTEND_URL=http://localhost:4200
MONGODB_URI=mongodb://127.0.0.1:27017/gamodan
SESSION_SECRET=troque-por-uma-chave-aleatoria-grande
ADMIN_EMAILS=seu-email@exemplo.com
NODE_ENV=development
```

Inicie o MongoDB no Windows (se instalado como serviço, normalmente ele já inicia com o sistema). Você pode conferir a conexão pelo `mongosh`:

```javascript
show dbs
```

Depois inicie a API:

```bash
npm run dev
```

A API deve informar que está disponível em `http://localhost:3000` e conectada ao MongoDB. Teste `http://localhost:3000/api/health`.

## 2. Iniciar o Angular

Em outro terminal, na pasta raiz `ProjetoGamodan`:

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

## Funcionalidades conectadas ao MongoDB
- Cadastro e login por e-mail/senha; senhas são armazenadas com bcrypt, nunca em texto puro.
- Sessão autenticada via cookie HTTP-only, com sessões armazenadas no MongoDB.
- Perfil básico (foto e preferências).
- Comentários e avaliações por jogo; cada usuário pode criar ou atualizar sua avaliação.
- Acesso administrativo configurado por `ADMIN_EMAILS` no `.env` do backend.
- Login Steam opcional, configurado com as variáveis `STEAM_API_KEY`, `STEAM_RETURN_URL` e `STEAM_REALM`.

## Testes
- Front: `npm run test:run`
- API (não precisa do MongoDB): `cd steam-backend && npm test`

## Endpoints principais
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PATCH /api/users/me`
- `GET /api/reviews/:gameSlug`
- `PUT /api/reviews/:gameSlug`
- `DELETE /api/reviews/:gameSlug`
- `GET /api/users/:id/avatar` (foto de perfil como imagem, com cache)
- `GET /api/community/posts?limit=&before=` (paginação por cursor; resposta traz `nextCursor`)
- `GET /api/free-games?q=&limit=`, `GET /api/free-games/by-title?title=`, `GET /api/free-games/:id` (proxy com cache da FreeToGame)

## Observações
- Comentários de demonstração dos perfis da comunidade continuam aparecendo identificados como conteúdo fictício. Comentários publicados por usuários são gravados no MongoDB.
- A lista pessoal de jogos e o catálogo administrativo ainda usam armazenamento local do navegador; não devem ser considerados sincronizados entre dispositivos nesta etapa.
- Para publicar em produção, configure HTTPS, `NODE_ENV=production`, um segredo forte e `FRONTEND_URL` com o domínio real do frontend. Se frontend e API estiverem em domínios diferentes, revise a política de cookies `SameSite` e `Secure`.
