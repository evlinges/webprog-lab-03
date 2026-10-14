// Контролер позицій замовлення.
const createCrudController = require('../utils/crudController');
const { OrderItem } = require('../models');

module.exports = createCrudController({
  model: OrderItem,
  name: 'Позицію замовлення',
  resource: 'order-items',
  include: {
    order: { select: { id: true, status: true, clientId: true } },
    stockItem: true,
    stages: { include: { executor: { select: { id: true, fullName: true } } } },
  },
  allowedSort: ['id', 'sortOrder'],
  defaultSort: { id: 'asc' },
  buildFilter: (q) => {
    const where = {};
    if (q.orderId) where.orderId = Number(q.orderId);
    if (q.type) where.type = q.type;
    return where;
  },
});
