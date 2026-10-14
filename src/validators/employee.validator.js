const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const roleEnum = z.enum(['manager', 'designer', 'production', 'admin']);

const createBody = z.object({
  fullName: z.string().min(1, 'ПІБ працівника обовʼязкове').max(200),
  role: roleEnum,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Колір має бути у форматі #RRGGBB')
    .optional(),
  initials: z.string().max(4).optional(),
  active: z.boolean().optional(),
});

const updateBody = createBody.partial();

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
