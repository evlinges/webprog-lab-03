// Базові тести endpoints аутентифікації та захисту маршрутів.
// Запуск: npm test (node --test). Потрібні піднята база та застосовані міграції.
//
// Тестове середовище вимикає morgan і rate limiting (див. app.js), тож ліміти
// не заважають багаторазовим запитам під час прогону.
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const prisma = require('../src/models/prisma');

// Унікальна пошта на кожен прогін, щоб тести не конфліктували з даними в базі.
const unique = `test_${Date.now()}@rezanok.ua`;
const password = 'test12345';
let accessToken;
let refreshToken;

test.after(async () => {
  // Прибираємо за собою створеного тестового користувача та відключаємося.
  await prisma.user.deleteMany({ where: { email: unique } });
  await prisma.$disconnect();
});

test('POST /api/auth/register — реєструє користувача (201) і видає токени', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: unique, password, fullName: 'Тест Користувач' });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.email, unique);
  assert.equal(res.body.data.user.role, 'user'); // роль не можна задати ззовні
  assert.ok(res.body.data.accessToken);
  assert.ok(res.body.data.refreshToken);
});

test('POST /api/auth/register — повторна пошта повертає 409', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: unique, password, fullName: 'Дубль' });
  assert.equal(res.status, 409);
});

test('POST /api/auth/register — короткий пароль не проходить валідацію (400)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `x_${Date.now()}@rezanok.ua`, password: '123', fullName: 'X' });
  assert.equal(res.status, 400);
});

test('POST /api/auth/login — вхід з правильним паролем (200)', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: unique, password });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.accessToken);
  accessToken = res.body.data.accessToken;
  refreshToken = res.body.data.refreshToken;
});

test('POST /api/auth/login — невірний пароль повертає 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: unique, password: 'wrongpass' });
  assert.equal(res.status, 401);
});

test('GET /api/auth/me — без токена 401, з токеном 200', async () => {
  const noToken = await request(app).get('/api/auth/me');
  assert.equal(noToken.status, 401);

  const withToken = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);
  assert.equal(withToken.status, 200);
  assert.equal(withToken.body.data.email, unique);
});

test('GET /api/clients — захищений маршрут потребує токена (401)', async () => {
  const res = await request(app).get('/api/clients');
  assert.equal(res.status, 401);
});

test('DELETE /api/clients/:id — звичайному користувачу заборонено (403)', async () => {
  const res = await request(app)
    .delete('/api/clients/1')
    .set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 403);
});

test('POST /api/auth/refresh — видає нову пару, старий токен відкликається', async () => {
  const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
  assert.equal(first.status, 200);
  assert.ok(first.body.data.accessToken);

  // Повторне використання вже обміняного токена має бути відхилене.
  const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
  assert.equal(reuse.status, 401);
});

test('POST /api/files — недозволений тип файлу повертає 400', async () => {
  const res = await request(app)
    .post('/api/files')
    .set('Authorization', `Bearer ${accessToken}`)
    .attach('file', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
  assert.equal(res.status, 400);
});
