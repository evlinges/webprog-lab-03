// Тести WebSocket-шару: автентифікація з'єднань, кімнати та персональні
// сповіщення. Піднімаємо справжній HTTP+Socket.io сервер на випадковому порту
// і під'єднуємося реальним клієнтом socket.io-client.
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { io: connect } = require('socket.io-client');

const app = require('../src/app');
const { initSocket } = require('../src/socket');
const { signAccessToken } = require('../src/utils/jwt');
const prisma = require('../src/models/prisma');

let url;
let io;
let httpServer;
const clients = [];

test.before(async () => {
  httpServer = createServer(app);
  io = initSocket(httpServer);
  app.set('io', io);
  httpServer.listen(0);
  await once(httpServer, 'listening');
  url = `http://localhost:${httpServer.address().port}`;
});

test.after(async () => {
  clients.forEach((c) => c.close());
  io.close();
  httpServer.close();
  await prisma.$disconnect();
});

// Зручний токен для тестів (сокет перевіряє лише підпис, без звернення до БД).
const token = (id, role = 'user') => signAccessToken({ id, role });

test('підключення без токена відхиляється', async () => {
  const client = connect(url, { auth: {}, reconnection: false });
  clients.push(client);
  const [error] = await once(client, 'connect_error');
  assert.equal(error.message, 'unauthorized');
});

test('підключення з валідним токеном успішне', async () => {
  const client = connect(url, { auth: { token: token(1) }, reconnection: false });
  clients.push(client);
  await once(client, 'connect');
  assert.ok(client.id);
});

test('кімнати ізолюють події, персональні сповіщення доходять адресату', async () => {
  const alice = connect(url, { auth: { token: token(1) }, reconnection: false });
  const bob = connect(url, { auth: { token: token(2) }, reconnection: false });
  clients.push(alice, bob);
  await Promise.all([once(alice, 'connect'), once(bob, 'connect')]);

  // Alice приєднується до кімнати замовлення, Bob — ні.
  const ack = await alice.emitWithAck('room:join', 'order:7');
  assert.deepEqual(ack, { ok: true, room: 'order:7' });

  // Подію в кімнаті order:7 має отримати лише Alice.
  const aliceGot = once(alice, 'order:updated');
  let bobGotRoomEvent = false;
  bob.on('order:updated', () => (bobGotRoomEvent = true));
  io.to('order:7').emit('order:updated', { id: 5, status: 'done' });
  const [payload] = await aliceGot;
  assert.deepEqual(payload, { id: 5, status: 'done' });

  // Персональне сповіщення в user:2 має отримати лише Bob.
  const bobNotif = once(bob, 'notification');
  io.to('user:2').emit('notification', { title: 'Привіт' });
  const [notif] = await bobNotif;
  assert.deepEqual(notif, { title: 'Привіт' });
  assert.equal(bobGotRoomEvent, false);
});

test('онлайн-статус: новому сокету надходить список онлайн-користувачів', async () => {
  const client = connect(url, { auth: { token: token(42) }, reconnection: false });
  clients.push(client);
  const [list] = await once(client, 'presence:list');
  assert.ok(Array.isArray(list.online));
  assert.ok(list.online.includes(42));
});

test('sync повертає пропущені події кімнати після перепідключення', async () => {
  const client = connect(url, { auth: { token: token(7) }, reconnection: false });
  clients.push(client);
  await once(client, 'connect');
  await client.emitWithAck('room:join', 'sync-room');

  // Записуємо подію в історію через той самий механізм, що й контролери.
  const { broadcast } = require('../src/socket/broadcast');
  const entry = broadcast(io, 'sync-room', 'thing:changed', { value: 1 });

  // Запитуємо події з курсором на одиницю менше — маємо отримати цю подію.
  const { missed } = await client.emitWithAck('sync', { cursors: { 'sync-room': entry.seq - 1 } });
  assert.ok(missed['sync-room'].some((e) => e.seq === entry.seq));
});
