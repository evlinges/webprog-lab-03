const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const createBody = z.object({
  orderId: z.number().int().positive('orderId обовʼязковий'),
  method: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  ttn: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const updateBody = z.object({
  method: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  ttn: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
