// Ініціалізація Socket.io: автентифікація з'єднань через JWT, кімнати для
// групування користувачів, онлайн-статус та відновлення пропущених подій.
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const config = require('../config/env');
const Presence = require('./presence');
const EventHistory = require('./eventHistory');

// Простий лічильник частоти подій на сокет — захист від флуду (рівень 3).
const EVENT_WINDOW_MS = 10_000;
const EVENT_MAX = 100;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl === '*' ? '*' : config.frontendUrl.split(',').map((s) => s.trim()),
      credentials: true,
    },
  });

  const presence = new Presence();
  const history = new EventHistory();
  // Робимо доступними для хелпера broadcast та для тестів.
  io.presence = presence;
  io.history = history;

  // Автентифікація рукостискання: сокет без валідного access-токена не підключиться.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const payload = verifyAccessToken(token);
      if (payload.type !== 'access') throw new Error('bad token');
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Кожен користувач автоматично у своїй персональній кімнаті для сповіщень.
    socket.join(`user:${userId}`);

    // Онлайн-статус: якщо користувач щойно став онлайн — повідомляємо всіх.
    if (presence.add(userId, socket.id)) {
      io.emit('presence:update', { userId, online: true });
    }
    // Новому сокету одразу надсилаємо поточний список онлайн-користувачів.
    socket.emit('presence:list', { online: presence.list() });

    // Лічильник частоти подій.
    let windowStart = Date.now();
    let eventCount = 0;
    socket.use((packet, next) => {
      const now = Date.now();
      if (now - windowStart > EVENT_WINDOW_MS) {
        windowStart = now;
        eventCount = 0;
      }
      eventCount += 1;
      if (eventCount > EVENT_MAX) {
        return next(new Error('rate limit exceeded'));
      }
      next();
    });

    // Приєднання до кімнати (напр. 'order:7' — усі, хто дивиться це замовлення).
    socket.on('room:join', (room, ack) => {
      if (typeof room === 'string' && room.length <= 100) {
        socket.join(room);
        if (typeof ack === 'function') ack({ ok: true, room });
      } else if (typeof ack === 'function') {
        ack({ ok: false, error: 'invalid room' });
      }
    });

    socket.on('room:leave', (room) => {
      if (typeof room === 'string') socket.leave(room);
    });

    // Відновлення пропущених подій після перепідключення.
    // payload: { cursors: { 'order:7': 42, 'user:3': 10 } }
    socket.on('sync', (payload, ack) => {
      const missed = {};
      const cursors = (payload && payload.cursors) || {};
      for (const [room, cursor] of Object.entries(cursors)) {
        missed[room] = history.since(room, Number(cursor) || 0);
      }
      if (typeof ack === 'function') ack({ missed });
    });

    socket.on('disconnect', () => {
      if (presence.remove(userId, socket.id)) {
        io.emit('presence:update', { userId, online: false });
      }
    });
  });

  return io;
}

module.exports = { initSocket };
