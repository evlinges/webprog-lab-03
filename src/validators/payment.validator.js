const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const methodEnum = z.enum(['cash', 'card', 'bank', 'manual']);

const createBody = z.object({
  orderId: z.number().int().positive('orderId обовʼязковий'),
  amount: z.number().positive('Сума оплати має бути додатною'),
  method: methodEnum.optional(),
  sender: z.string().max(200).optional(),
  purpose: z.string().max(500).optional(),
  paidAt: z.coerce.date().optional(),
});

const updateBody = z.object({
  amount: z.number().positive().optional(),
  method: methodEnum.optional(),
  sender: z.string().max(200).optional(),
  purpose: z.string().max(500).optional(),
  paidAt: z.coerce.date().optional(),
});

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
