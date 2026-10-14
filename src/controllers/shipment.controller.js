// Контролер доставок (звʼязок 1:1 із замовленням).
const createCrudController = require('../utils/crudController');
const { Shipment } = require('../models');

module.exports = createCrudController({
  model: Shipment,
  name: 'Доставку',
  resource: 'shipments',
  include: {
    order: { select: { id: true, status: true, clientId: true } },
  },
  allowedSort: ['id'],
  defaultSort: { id: 'desc' },
  buildFilter: (q) => {
    const where = {};
    if (q.ttn) where.ttn = { contains: q.ttn, mode: 'insensitive' };
    if (q.method) where.method = q.method;
    return where;
  },
});
