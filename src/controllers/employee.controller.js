// Контролер працівників майстерні.
const createCrudController = require('../utils/crudController');
const { Employee } = require('../models');

module.exports = createCrudController({
  model: Employee,
  name: 'Працівника',
  resource: 'employees',
  cacheList: true,
  includeList: { _count: { select: { assignments: true, stages: true } } },
  includeOne: {
    assignments: { include: { order: { select: { id: true, status: true } } } },
    stages: { include: { orderItem: { select: { id: true, type: true } } } },
  },
  allowedSort: ['id', 'fullName'],
  defaultSort: { id: 'asc' },
  buildFilter: (q) => {
    const where = {};
    if (q.role) where.role = q.role;
    if (q.active !== undefined) where.active = q.active === 'true' || q.active === true;
    if (q.search) where.fullName = { contains: q.search, mode: 'insensitive' };
    return where;
  },
});
