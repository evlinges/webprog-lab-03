const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const statusEnum = z.enum(['new', 'work', 'done', 'problem']);
const sourceEnum = z.enum(['instagram', 'facebook', 'site', 'referral', 'repeat']);
const roleEnum = z.enum(['manager', 'designer', 'production', 'admin']);

// Позиція, яку можна створити разом із замовленням (вкладений create).
const nestedItem = z.object({
  type: z.string().min(1, 'Тип виробу обовʼязковий').max(100),
  qty: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  details: z.string().max(1000).optional(),
  stockItemId: z.number().int().positive().optional(),
  sortOrder: z.number().int().optional(),
});

const createBody = z.object({
  clientId: z.number().int().positive('clientId обовʼязковий'),
  status: statusEnum.optional(),
  source: sourceEnum.optional(),
  deadline: z.coerce.date().optional(),
  note: z.string().max(1000).optional(),
  urgent: z.boolean().optional(),
  discount: z.number().min(0).max(100).optional(),
  items: z.array(nestedItem).optional(),
});

// В оновленні позиціями керуємо через окремі ендпоінти /order-items.
const updateBody = z.object({
  clientId: z.number().int().positive().optional(),
  status: statusEnum.optional(),
  source: sourceEnum.optional(),
  deadline: z.coerce.date().optional(),
  note: z.string().max(1000).optional(),
  urgent: z.boolean().optional(),
  discount: z.number().min(0).max(100).optional(),
});

// Тіло для додавання працівника до замовлення (звʼязок M:N).
const assignmentBody = z.object({
  employeeId: z.number().int().positive('employeeId обовʼязковий'),
  role: roleEnum,
});

const assignmentParams = z.object({
  id: z.coerce.number().int().positive(),
  assignmentId: z.coerce.number().int().positive(),
});

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
  addAssignment: { params: idParam, body: assignmentBody },
  removeAssignment: { params: assignmentParams },
};
