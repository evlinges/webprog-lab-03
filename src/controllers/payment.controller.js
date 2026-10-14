// Контролер оплат.
const createCrudController = require('../utils/crudController');
const { Payment } = require('../models');

module.exports = createCrudController({
  model: Payment,
  name: 'Оплату',
  resource: 'payments',
  include: {
    order: { select: { id: true, status: true, clientId: true } },
  },
  allowedSort: ['id', 'amount', 'paidAt'],
  defaultSort: { paidAt: 'desc' },
  buildFilter: (q) => {
    const where = {};
    if (q.orderId) where.orderId = Number(q.orderId);
    if (q.method) where.method = q.method;
    return where;
  },
});
