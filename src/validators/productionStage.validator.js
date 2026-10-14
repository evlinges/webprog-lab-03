const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const statusEnum = z.enum(['pending', 'in_progress', 'done', 'skip']);

const createBody = z.object({
  orderItemId: z.number().int().positive('orderItemId обовʼязковий'),
  stage: z.string().min(1, 'Назва стадії обовʼязкова').max(100),
  status: statusEnum.optional(),
  executorId: z.number().int().positive().nullable().optional(),
  note: z.string().max(1000).optional(),
});

const updateBody = z.object({
  stage: z.string().min(1).max(100).optional(),
  status: statusEnum.optional(),
  executorId: z.number().int().positive().nullable().optional(),
  note: z.string().max(1000).optional(),
});

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
