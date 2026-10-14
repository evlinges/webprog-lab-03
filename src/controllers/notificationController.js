// Контролер сповіщень поточного користувача. Сповіщення створюються сервісом
// notificationService при важливих подіях; тут — читання, позначення
// прочитаними та видалення. Користувач працює лише зі СВОЇМИ сповіщеннями.
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { Notification } = require('../models');
const { getPagination, buildMeta } = require('../utils/pagination');

function publicNotification(n) {
  return {
    id: n.id,
    type: n.type,
    priority: n.priority,
    title: n.title,
    body: n.body,
    data: n.data ? JSON.parse(n.data) : null,
    read: !!n.readAt,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

// GET /api/notifications — список своїх сповіщень (фільтр ?unread=true).
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = getPagination(req.query);
  const where = { userId: req.user.id };
  if (req.query.unread === 'true') where.readAt = null;
  if (req.query.type) where.type = req.query.type;

  const [data, total] = await Promise.all([
    Notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    Notification.count({ where }),
  ]);

  res.json({ success: true, data: data.map(publicNotification), meta: buildMeta(page, limit, total) });
});

// GET /api/notifications/unread-count — кількість непрочитаних (для бейджа).
const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.count({ where: { userId: req.user.id, readAt: null } });
  res.json({ success: true, data: { count } });
});

// Дістає сповіщення й перевіряє, що воно належить поточному користувачеві.
async function findOwn(id, userId) {
  const n = await Notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) throw AppError.notFound(`Сповіщення з id=${id} не знайдено`);
  return n;
}

// PATCH /api/notifications/:id/read — позначити прочитаним.
const markRead = asyncHandler(async (req, res) => {
  await findOwn(req.params.id, req.user.id);
  const n = await Notification.update({
    where: { id: req.params.id },
    data: { readAt: new Date() },
  });
  res.json({ success: true, data: publicNotification(n) });
});

// POST /api/notifications/read-all — позначити всі прочитаними.
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true, message: `Позначено прочитаними: ${result.count}` });
});

// DELETE /api/notifications/:id — видалити сповіщення.
const remove = asyncHandler(async (req, res) => {
  await findOwn(req.params.id, req.user.id);
  await Notification.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: `Сповіщення з id=${req.params.id} видалено` });
});

module.exports = { list, unreadCount, markRead, markAllRead, remove };
