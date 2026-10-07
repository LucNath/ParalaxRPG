const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { unlink } = require('node:fs/promises');
const { resolve } = require('node:path');
const sharp = require('sharp');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');

process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');
const { projectRoot } = require('../dist/common/environment');

describe('Autenticação e perfil com PostgreSQL real', { concurrency: false }, () => {
  let app, base, prisma, a, b;
  const users = [];
  const avatars = [];
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const account = name => ({ email: `${name}_${suffix}@example.test`, username: `${name}_${suffix}`, displayName: `Aventureiro ${name}`, password: 'Uma-senha-de-teste-123!' });
  function cookie(response) { return response.headers.get('set-cookie')?.split(';')[0]; }
  async function request(path, { token, refreshCookie, body, method = 'GET', headers = {} } = {}) {
    return fetch(`${base}${path}`, { method, headers: {
      Origin: 'http://localhost:3000', ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(refreshCookie ? { Cookie: refreshCookie } : {}), ...headers,
    }, ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
  }
  async function register(name) {
    const input = account(name);
    const response = await request('/auth/register', { method: 'POST', body: input });
    assert.equal(response.status, 201);
    const result = await response.json();
    users.push(result.user.id);
    return { ...result, input, cookie: cookie(response), headers: response.headers };
  }
  before(async () => {
    app = await createApplication(false);
    const config = app.get(ConfigService);
    const database = new URL(config.get('DATABASE_URL'));
    assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname), 'Execute testes apenas com PostgreSQL local de desenvolvimento.');
    assert.equal(database.pathname, '/paralax', 'O teste exige o banco local paralax.');
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api/v1`;
    prisma = app.get(PrismaService);
    a = await register('teste_a'); b = await register('teste_b');
  });
  after(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { id: { in: users } } });
    for (const key of avatars) {
      assert.match(key, /^[0-9a-f-]+\.webp$/);
      await unlink(resolve(projectRoot(), 'var/uploads/avatars', key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    if (app) await app.close();
  });

  it('persiste conta e perfil; guarda somente hash Argon2id e hash do refresh token', async () => {
    assert.equal(a.user.email, a.input.email);
    assert.ok(a.accessToken);
    assert.match(a.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(a.headers.get('set-cookie'), /SameSite=Lax/i);
    assert.match(a.headers.get('set-cookie'), /Path=\/api\/v1\/auth/);
    assert.equal(a.headers.get('cache-control'), 'no-store');
    const row = await prisma.user.findUnique({ where: { id: a.user.id }, include: { profile: true, refreshSessions: true } });
    assert.match(row.passwordHash, /^\$argon2id\$/);
    assert.notEqual(row.passwordHash, a.input.password);
    assert.equal(row.profile.displayName, a.input.displayName);
    assert.match(row.refreshSessions[0].tokenHash, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(a.user).includes('passwordHash'));
    assert.ok(!JSON.stringify(row).includes(a.cookie.split('=')[1]));
  });
  it('rejeita entradas inválidas, duplicatas, campos extras e JSON malformado', async () => {
    let response = await request('/auth/register', { method: 'POST', body: { ...account('invalid'), password: '123' } });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    response = await request('/auth/register', { method: 'POST', body: a.input });
    assert.equal(response.status, 409);
    response = await request('/auth/register', { method: 'POST', body: { ...account('extra'), role: 'ADMIN' } });
    assert.equal(response.status, 400);
    response = await request('/auth/login', { method: 'POST', body: '{' });
    assert.equal(response.status, 400);
    assert.equal(await prisma.user.count({ where: { username: account('invalid').username } }), 0);
  });
  it('nega credenciais incorretas com a mesma mensagem para conta existente e inexistente', async () => {
    const wrong = await request('/auth/login', { method: 'POST', body: { email: a.input.email, password: 'senha-incorreta' } });
    const missing = await request('/auth/login', { method: 'POST', body: { email: `ausente_${suffix}@example.test`, password: 'senha-incorreta' } });
    assert.equal(wrong.status, 401); assert.equal(missing.status, 401);
    assert.equal((await wrong.json()).error.message, (await missing.json()).error.message);
  });
  it('protege o perfil privado; não expõe e-mail nem campos secretos no perfil público', async () => {
    const anonymous = await request('/users/me'); assert.equal(anonymous.status, 401);
    const invalid = await request('/users/me', { token: `${a.accessToken}tampered` }); assert.equal(invalid.status, 401);
    const mine = await request('/users/me', { token: a.accessToken }); assert.equal(mine.status, 200);
    assert.equal((await mine.json()).id, a.user.id);
    const publicResponse = await request(`/users/${a.input.username}`);
    assert.equal(publicResponse.status, 200);
    const profile = await publicResponse.json();
    assert.equal(profile.username, a.input.username);
    assert.deepEqual(Object.keys(profile).sort(), ['id','username','displayName','bio','location','avatarUrl','joinedAt'].sort());
    assert.equal(profile.email, undefined); assert.equal(profile.passwordHash, undefined);
  });
  it('edita somente o próprio perfil e persiste; não permite mudar identidade ou editar outro usuário', async () => {
    const beforeB = await prisma.profile.findUnique({ where: { userId: b.user.id } });
    const response = await request('/users/me', { method: 'PATCH', token: a.accessToken, body: { displayName: 'Mestre de Aether', bio: 'Histórias e exploração.', location: 'Fortaleza' } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).displayName, 'Mestre de Aether');
    assert.equal((await prisma.profile.findUnique({ where: { userId: a.user.id } })).bio, 'Histórias e exploração.');
    const malicious = await request('/users/me', { method: 'PATCH', token: a.accessToken, body: { userId: b.user.id, displayName: 'Alterado' } });
    assert.equal(malicious.status, 400);
    const other = await request(`/users/${b.user.id}`, { method: 'PATCH', token: a.accessToken, body: { displayName: 'Alterado' } });
    assert.equal(other.status, 404);
    const afterB = await prisma.profile.findUnique({ where: { userId: b.user.id } });
    assert.deepEqual(afterB, beforeB);
    const loopback = await request('/users/me', { method: 'PATCH', token: a.accessToken, body: { location: 'Fortaleza' }, headers: { Origin: 'http://127.0.0.1:3000' } });
    assert.equal(loopback.status, 200);
  });
  it('verifica expiração, emissor e destinatário do access token', async () => {
    const jwt = app.get(JwtService); const secret = app.get(ConfigService).get('AUTH_ACCESS_SECRET');
    const sessions = await prisma.refreshSession.findMany({ where: { userId: a.user.id, revokedAt: null } });
    const claims = { sub: a.user.id, sid: sessions[0].id };
    for (const options of [{ expiresIn: -1, issuer: 'paralax-api', audience: 'paralax-web' }, { expiresIn: 900, issuer: 'outro', audience: 'paralax-web' }, { expiresIn: 900, issuer: 'paralax-api', audience: 'outro' }]) {
      const token = await jwt.signAsync(claims, { secret, algorithm: 'HS256', ...options });
      assert.equal((await request('/users/me', { token })).status, 401);
    }
  });
  it('rota refresh token, invalida access antigo e revoga a família quando há reutilização', async () => {
    const response = await request('/auth/refresh', { method: 'POST', refreshCookie: a.cookie });
    assert.equal(response.status, 200);
    const next = await response.json(); const nextCookie = cookie(response);
    assert.notEqual(nextCookie, a.cookie);
    assert.equal((await request('/users/me', { token: a.accessToken })).status, 401);
    assert.equal((await request('/users/me', { token: next.accessToken })).status, 200);
    assert.equal((await request('/auth/refresh', { method: 'POST', refreshCookie: a.cookie })).status, 401);
    assert.equal((await request('/users/me', { token: next.accessToken })).status, 401);
    assert.equal((await request('/auth/refresh', { method: 'POST', refreshCookie: nextCookie })).status, 401);
  });
  it('logout revoga refresh e access imediatamente; bloqueia origem externa e origem ausente no refresh', async () => {
    const badOrigin = await request('/auth/refresh', { method: 'POST', refreshCookie: b.cookie, headers: { Origin: 'https://example.invalid' } });
    assert.equal(badOrigin.status, 403);
    const absentOrigin = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { Cookie: b.cookie } });
    assert.equal(absentOrigin.status, 403);
    const out = await request('/auth/logout', { method: 'POST', refreshCookie: b.cookie });
    assert.equal(out.status, 204); assert.match(out.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
    assert.equal((await request('/users/me', { token: b.accessToken })).status, 401);
    assert.equal((await request('/auth/refresh', { method: 'POST', refreshCookie: b.cookie })).status, 401);
  });
  it('normaliza avatar válido, persiste referência e rejeita conteúdo falso ou arquivo grande', async () => {
    const login = await request('/auth/login', { method: 'POST', body: { email: a.input.email, password: a.input.password } });
    assert.equal(login.status, 200); const session = await login.json();
    const buffer = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#dfbd83' } }).png().toBuffer();
    const form = new FormData(); form.append('file', new Blob([buffer], { type: 'image/png' }), 'avatar.png');
    const response = await fetch(`${base}/users/me/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}`, Origin: 'http://localhost:3000' }, body: form });
    assert.equal(response.status, 201);
    const result = await response.json(); avatars.push(result.avatarUrl.split('/').pop());
    assert.match(result.avatarUrl, /^\/api\/v1\/avatars\/[0-9a-f-]+\.webp$/);
    const image = await fetch(`${base.replace('/api/v1', '')}${result.avatarUrl}`);
    assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/webp');
    const metadata = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
    assert.equal(metadata.width, 256); assert.equal(metadata.height, 256);
    assert.equal((await prisma.profile.findUnique({ where: { userId: a.user.id } })).avatarKey, avatars[0]);
    const fake = new FormData(); fake.append('file', new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/png' }), 'fake.png');
    assert.equal((await fetch(`${base}/users/me/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` }, body: fake })).status, 400);
    const large = new FormData(); large.append('file', new Blob([new Uint8Array(2 * 1024 * 1024 + 1)]), 'large.png');
    assert.equal((await fetch(`${base}/users/me/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` }, body: large })).status, 413);
    assert.equal((await request('/avatars/not-an-avatar')).status, 404);
  });
  it('preserva conta, perfil e sessão autenticada após reiniciar a API', async () => {
    const login = await request('/auth/login', { method: 'POST', body: { email: a.input.email, password: a.input.password } });
    assert.equal(login.status, 200); const session = await login.json();
    await app.close();
    app = await createApplication(false);
    prisma = app.get(PrismaService);
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api/v1`;
    const response = await request('/users/me', { token: session.accessToken });
    assert.equal(response.status, 200);
    const profile = await response.json();
    assert.equal(profile.id, a.user.id);
    assert.equal(profile.displayName, 'Mestre de Aether');
    assert.equal(profile.bio, 'Histórias e exploração.');
    assert.equal(profile.avatarUrl.split('/').pop(), avatars[0]);
  });
  it('limita tentativas de login sem revelar detalhes internos', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      assert.equal((await request('/auth/login', { method: 'POST', body: { email: a.input.email, password: 'senha-incorreta' } })).status, 401);
    }
    const response = await request('/auth/login', { method: 'POST', body: { email: a.input.email, password: 'senha-incorreta' } });
    assert.equal(response.status, 429);
    assert.equal((await response.json()).error.message, 'Muitas tentativas. Aguarde um pouco e tente novamente.');
  });
});
