// Сервіс генерації сповіщень. Сповіщення зберігається в БД (щоб не губилося)
// і одночасно доставляється адресату в реальному часі через його персональну
// кімнату user:<id>.
const { Notification, User } = require('../models');
const { broadcast } = require('../socket/broadcast');

// Створює сповіщення для одного користувача та миттєво доставляє його.
async function createNotification(io, userId, { type = 'system', priority = 'normal', title, body = null, data = null }) {
  const notification = await Notification.create({
    data: {
      userId,
      type,
      priority,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
    },
  });

  broadcast(io, `user:${userId}`, 'notification', {
    id: notification.id,
    type: notification.type,
    priority: notification.priority,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt,
  });

  return notification;
}

// Групова розсилка всім активним адміністраторам (batch) — напр. про нову оплату.
async function notifyAdmins(io, options) {
  const admins = await User.findMany({
    where: { role: 'admin', active: true },
    select: { id: true },
  });
  return Promise.all(admins.map((a) => createNotification(io, a.id, options)));
}

module.exports = { createNotification, notifyAdmins };
