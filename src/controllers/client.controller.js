// Контролер клієнтів. Список показує кількість замовлень кожного клієнта,
// а окремий запис — усі його замовлення.
const createCrudController = require('../utils/crudController');
const { Client } = require('../models');

module.exports = createCrudController({
  model: Client,
  name: 'Клієнта',
  resource: 'clients',
  includeList: { _count: { select: { orders: true } } },
  includeOne: { orders: { orderBy: { createdAt: 'desc' } } },
  allowedSort: ['id', 'name', 'createdAt'],
  defaultSort: { createdAt: 'desc' },
  buildFilter: (q) => {
    const where = {};
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.source) where.source = q.source;
    return where;
  },
});
