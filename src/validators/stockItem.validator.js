const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const createBody = z.object({
  groupName: z.string().min(1, 'Група обовʼязкова').max(100),
  label: z.string().min(1, 'Назва обовʼязкова').max(200),
  dims: z.string().max(100).optional(),
  qty: z.number().int().min(0).optional(),
  lowThreshold: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
});

const updateBody = createBody.partial();

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
