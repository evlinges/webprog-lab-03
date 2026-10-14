// Контролер замовлень — центральна й найскладніша сутність домену.
// Окрім типового CRUD, тут:
//   • вкладене створення позицій разом із замовленням;
//   • автоматичний розрахунок підсумків (сума позицій, знижка, сплачено, борг);
//   • керування звʼязком M:N «замовлення ↔ працівники».
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { Order, prisma } = require('../models');
const { broadcast, ioFrom } = require('../socket/broadcast');
const { notifyAdmins } = require('../services/notificationService');

// Набір повʼязаних даних, які підвантажуємо для повної картини замовлення.
const fullInclude = {
  client: true,
  items: {
    include: {
      stockItem: true,
      stages: { include: { executor: { select: { id: true, fullName: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  },
  payments: { orderBy: { paidAt: 'desc' } },
  shipment: true,
  assignments: { include: { employee: { select: { id: true, fullName: true, role: true } } } },
};

const num = (v) => (v == null ? 0 : Number(v));
const round2 = (n) => Math.round(n * 100) / 100;

// Додає до замовлення блок totals із розрахованими грошовими підсумками.
function withTotals(order) {
  if (!order) return order;
  const itemsTotal = (order.items || []).reduce((sum, it) => {
    return sum + num(it.price) * it.qty * (1 - num(it.discount) / 100);
  }, 0);
  const total = itemsTotal * (1 - num(order.discount) / 100);
  const paid = (order.payments || []).reduce((s, p) => s + num(p.amount), 0);
  return {
    ...order,
    totals: {
      itemsTotal: round2(itemsTotal),
      total: round2(total),
      paid: round2(paid),
      balance: round2(total - paid),
    },
  };
}

const ALLOWED_SORT = ['id', 'createdAt', 'deadline', 'status'];

module.exports = {
  // GET /orders
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.clientId) where.clientId = Number(req.query.clientId);
    if (req.query.urgent !== undefined) {
      where.urgent = req.query.urgent === 'true' || req.query.urgent === true;
    }
    // Пошук за іменем клієнта (через повʼязану таблицю).
    if (req.query.search) {
      where.client = { name: { contains: req.query.search, mode: 'insensitive' } };
    }
    // Фільтрація за діапазоном дедлайну: ?deadlineFrom=&deadlineTo= (YYYY-MM-DD).
    if (req.query.deadlineFrom || req.query.deadlineTo) {
      where.deadline = {};
      if (req.query.deadlineFrom) where.deadline.gte = new Date(req.query.deadlineFrom);
      if (req.query.deadlineTo) where.deadline.lte = new Date(req.query.deadlineTo);
    }

    let orderBy = { createdAt: 'desc' };
    if (req.query.sort && ALLOWED_SORT.includes(req.query.sort)) {
      orderBy = { [req.query.sort]: req.query.order === 'asc' ? 'asc' : 'desc' };
    }

    const [rows, total] = await Promise.all([
      Order.findMany({ where, include: fullInclude, orderBy, skip, take }),
      Order.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows.map(withTotals),
      meta: buildMeta(page, limit, total),
    });
  }),

  // GET /orders/:id
  getById: asyncHandler(async (req, res) => {
    const order = await Order.findUnique({
      where: { id: req.params.id },
      include: fullInclude,
    });
    if (!order) throw AppError.notFound(`Замовлення з id=${req.params.id} не знайдено`);
    res.json({ success: true, data: withTotals(order) });
  }),

  // POST /orders — із можливими вкладеними позиціями
  create: asyncHandler(async (req, res) => {
    const { clientId, items, ...rest } = req.body;

    // Перевіряємо існування клієнта заздалегідь — зрозуміліша помилка, ніж FK.
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw AppError.badRequest(`Клієнта з id=${clientId} не існує`);

    const data = { ...rest, client: { connect: { id: clientId } } };

    if (Array.isArray(items) && items.length > 0) {
      data.items = {
        create: items.map((it, i) => ({
          type: it.type,
          qty: it.qty ?? 1,
          price: it.price ?? 0,
          discount: it.discount ?? 0,
          details: it.details,
          sortOrder: it.sortOrder ?? i,
          ...(it.stockItemId ? { stockItem: { connect: { id: it.stockItemId } } } : {}),
        })),
      };
    }

    const order = await Order.create({ data, include: fullInclude });

    // Реальний час: оновлюємо список замовлень і сповіщаємо адміністраторів.
    const io = ioFrom(req);
    broadcast(io, 'orders', 'orders:changed', { action: 'created', id: order.id });
    broadcast(io, `order:${order.id}`, 'order:created', { id: order.id });
    await notifyAdmins(io, {
      type: 'order',
      priority: order.urgent ? 'high' : 'normal',
      title: 'Нове замовлення',
      body: `Клієнт: ${order.client ? order.client.name : '—'}`,
      data: { orderId: order.id },
    });

    res.status(201).json({ success: true, data: withTotals(order) });
  }),

  // PUT/PATCH /orders/:id
  update: asyncHandler(async (req, res) => {
    const order = await Order.update({
      where: { id: req.params.id },
      data: req.body,
      include: fullInclude,
    });

    // Реальний час: усі, хто дивиться це замовлення, бачать оновлення миттєво.
    const io = ioFrom(req);
    broadcast(io, `order:${order.id}`, 'order:updated', { id: order.id, status: order.status });
    broadcast(io, 'orders', 'orders:changed', { action: 'updated', id: order.id });
    // Якщо змінився статус — окреме сповіщення (проблемний статус — високий пріоритет).
    if (req.body.status) {
      await notifyAdmins(io, {
        type: 'order',
        priority: req.body.status === 'problem' ? 'high' : 'normal',
        title: 'Статус замовлення змінено',
        body: `Замовлення #${order.id} → ${order.status}`,
        data: { orderId: order.id, status: order.status },
      });
    }

    res.json({ success: true, data: withTotals(order) });
  }),

  // DELETE /orders/:id — позиції, оплати, доставка й призначення видаляються каскадно
  remove: asyncHandler(async (req, res) => {
    await Order.delete({ where: { id: req.params.id } });

    const io = ioFrom(req);
    broadcast(io, 'orders', 'orders:changed', { action: 'deleted', id: req.params.id });
    broadcast(io, `order:${req.params.id}`, 'order:deleted', { id: req.params.id });

    res.json({ success: true, message: `Замовлення з id=${req.params.id} видалено` });
  }),

  // POST /orders/:id/assignments — призначити працівника на замовлення (M:N)
  addAssignment: asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    const { employeeId, role } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw AppError.notFound(`Замовлення з id=${orderId} не знайдено`);

    const assignment = await prisma.orderAssignment.create({
      data: { orderId, employeeId, role },
      include: { employee: { select: { id: true, fullName: true, role: true } } },
    });
    res.status(201).json({ success: true, data: assignment });
  }),

  // DELETE /orders/:id/assignments/:assignmentId — зняти призначення
  removeAssignment: asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    await prisma.orderAssignment.delete({ where: { id: assignmentId } });
    res.json({ success: true, message: `Призначення id=${assignmentId} видалено` });
  }),
};
