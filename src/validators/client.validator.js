const { z } = require('zod');
const { idParam, listQuery } = require('./common');

const sourceEnum = z.enum(['instagram', 'facebook', 'site', 'referral', 'repeat']);

const createBody = z.object({
  name: z.string().min(1, 'Імʼя клієнта обовʼязкове').max(200),
  phone: z.string().max(30).optional(),
  source: sourceEnum.optional(),
  note: z.string().max(1000).optional(),
});

const updateBody = createBody.partial();

module.exports = {
  list: { query: listQuery },
  byId: { params: idParam },
  create: { body: createBody },
  update: { params: idParam, body: updateBody },
};
