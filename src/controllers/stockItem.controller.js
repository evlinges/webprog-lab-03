// Контролер складу заготовок.
const createCrudController = require('../utils/crudController');
const { StockItem } = require('../models');

module.exports = createCrudController({
  model: StockItem,
  name: 'Позицію складу',
  resource: 'stock-items',
  cacheList: true,
  includeList: { _count: { select: { orderItems: true } } },
  includeOne: { _count: { select: { orderItems: true } } },
  allowedSort: ['id', 'label', 'qty', 'price'],
  defaultSort: { id: 'asc' },
  buildFilter: (q) => {
    const where = {};
    if (q.group) where.groupName = q.group;
    if (q.search) where.label = { contains: q.search, mode: 'insensitive' };
    // ?low=true — лише позиції, у яких залишок нижчий за поріг
    if (q.low === 'true') where.qty = { lte: 5 };
    return where;
  },
});
