// Спільні Zod-схеми, які повторно використовуються різними сутностями.
const { z } = require('zod');

// Параметр :id у маршруті — приводимо рядок з URL до додатного цілого.
const idParam = z.object({
  id: z.coerce.number().int().positive('id має бути додатним цілим числом'),
});

// Базові query-параметри списку: пагінація та сортування.
// passthrough() дозволяє сутностям додавати власні фільтри (?status=, ?search=).
const listQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  })
  .passthrough();

module.exports = { idParam, listQuery };
