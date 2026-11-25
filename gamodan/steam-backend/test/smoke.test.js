// Testes rápidos das rotas que não precisam de banco de dados.
// Rode com:  npm test
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-ok';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/gamodan-test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

let server;
let base;
test.before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); setTimeout(() => process.exit(0), 50); });

const json = (path, options) => fetch(`${base}${path}`, options).then(async (res) => ({ status: res.status, body: await res.json().catch(() => null), headers: res.headers }));
const post = (path, body, raw = false) => json(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body) });

test('health responde sem banco', async () => {
  const res = await json('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.database, 'disconnected');
});

test('rota inexistente devolve 404 em JSON', async () => {
  const res = await json('/api/nao-existe');
  assert.equal(res.status, 404);
  assert.ok(res.body.message);
});

test('JSON quebrado devolve 400, não 500', async () => {
  const res = await post('/api/auth/register', '{quebrado', true);
  assert.equal(res.status, 400);
});

test('cadastro valida os campos antes de tocar no banco', async () => {
  assert.equal((await post('/api/auth/register', { nome: 'A', email: 'a@a.com', senha: '12345678' })).status, 400);
  assert.equal((await post('/api/auth/register', { nome: 'Ana', email: 'invalido', senha: '12345678' })).status, 400);
  assert.equal((await post('/api/auth/register', { nome: 'Ana', email: 'ana@exemplo.com', senha: 'curta' })).status, 400);
  assert.equal((await post('/api/auth/register', { nome: 'Ana', email: 'ana@exemplo.com', senha: '12345678', foto: 'javascript:alert(1)' })).status, 400);
  assert.equal((await post('/api/auth/register', { nome: 'Ana', email: 'ana@exemplo.com', senha: '12345678', foto: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
});

test('cadastro sem corpo não quebra (req.body indefinido no Express 5)', async () => {
  const res = await json('/api/auth/register', { method: 'POST' });
  assert.equal(res.status, 400);
});

test('ids e slugs inválidos devolvem 400', async () => {
  assert.equal((await json('/api/community/users/abc/follow-stats')).status, 400);
  assert.equal((await json('/api/reviews/Slug%20Inv%C3%A1lido')).status, 400);
  assert.equal((await json('/api/free-games/abc')).status, 400);
});

test('rotas protegidas exigem login', async () => {
  assert.equal((await json('/api/auth/me')).status, 401);
  assert.equal((await json('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await post('/api/community/posts', { text: 'oi' })).status, 401);
  assert.equal((await json('/api/steam/games')).status, 401);
});

test('cabeçalhos de segurança e CORS', async () => {
  const res = await json('/api/health', { headers: { Origin: 'http://localhost:4200' } });
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:4200');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(res.headers.get('x-powered-by'), null);
  const blocked = await json('/api/health', { headers: { Origin: 'http://malicioso.example' } });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});
