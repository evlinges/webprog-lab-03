const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const createBody = z.object({
  orderId: z.number().int().positive('orderId обовʼязковий'),
  type: z.string().min(1, 'Тип виробу обовʼязковий').max(100),
  qty: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  details: z.string().max(1000).optional(),
  stockItemId: z.number().int().positive().optional(),
  sortOrder: z.number().int().optional(),
});

// orderId не змінюємо після створення позиції.
const updateBody = z.object({
  type: z.string().min(1).max(100).optional(),
  qty: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  details: z.string().max(1000).optional(),
  stockItemId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
