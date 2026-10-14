// Контролер виробничих стадій.
const createCrudController = require('../utils/crudController');
const { ProductionStage } = require('../models');

module.exports = createCrudController({
  model: ProductionStage,
  name: 'Виробничу стадію',
  resource: 'production-stages',
  include: {
    orderItem: { select: { id: true, type: true, orderId: true } },
    executor: { select: { id: true, fullName: true, role: true } },
  },
  allowedSort: ['id', 'updatedAt'],
  defaultSort: { id: 'asc' },
  buildFilter: (q) => {
    const where = {};
    if (q.orderItemId) where.orderItemId = Number(q.orderItemId);
    if (q.status) where.status = q.status;
    if (q.stage) where.stage = q.stage;
    if (q.executorId) where.executorId = Number(q.executorId);
    return where;
  },
});
