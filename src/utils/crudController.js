// Фабрика типового CRUD-контролера. Прибирає дублювання: кожна сутність
// отримує однакові операції list/getById/create/update/remove, а особливості
// (які звʼязки підвантажувати, як фільтрувати) задаються через параметри.
//
// ЛР3: якщо задано `resource`, після кожної зміни (create/update/remove)
// контролер розсилає подію `<resource>:changed` у кімнату `<resource>` —
// усі клієнти, підписані на цю сутність, одразу бачать оновлення.
const asyncHandler = require('./asyncHandler');
const AppError = require('./AppError');
const { getPagination, buildMeta } = require('./pagination');
const { broadcast, ioFrom } = require('../socket/broadcast');
const { invalidate } = require('./cache');

function createCrudController(options) {
  const {
    model, // Prisma-делегат моделі
    name, // назва сутності для повідомлень (у знахідному відмінку)
    resource, // назва ресурсу для подій реального часу та кешу (напр. 'clients')
    include, // звʼязки за замовчуванням (для одного і для списку)
    includeList, // перевизначення include для списку
    includeOne, // перевизначення include для одного запису
    allowedSort = ['id'], // білий список полів для сортування
    defaultSort = { id: 'desc' },
    buildFilter, // (query) => where-обʼєкт Prisma
    cacheList = false, // кешувати відповіді списку (для рідко змінюваних даних)
  } = options;

  const listInclude = includeList ?? include;
  const oneInclude = includeOne ?? include;

  // Сповіщає підписників про зміну сутності й скидає її кеш.
  function announce(req, action, id) {
    if (resource) {
      broadcast(ioFrom(req), resource, `${resource}:changed`, { action, id });
      invalidate(resource);
    }
  }

  return {
    // GET / — список із пагінацією, фільтрами та сортуванням
    list: asyncHandler(async (req, res) => {
      const { page, limit, skip, take } = getPagination(req.query);
      const where = buildFilter ? buildFilter(req.query) : {};

      let orderBy = defaultSort;
      if (req.query.sort && allowedSort.includes(req.query.sort)) {
        orderBy = { [req.query.sort]: req.query.order === 'asc' ? 'asc' : 'desc' };
      }

      const { getOrSet } = require('./cache');
      const run = async () => {
        const [data, total] = await Promise.all([
          model.findMany({ where, include: listInclude, orderBy, skip, take }),
          model.count({ where }),
        ]);
        return { success: true, data, meta: buildMeta(page, limit, total) };
      };

      // Кешуємо лише «чисті» списки без фільтрів/сортування (щоб ключ був простим).
      const plain = !req.query.sort && !buildFilter;
      let body;
      if (cacheList && resource && plain) {
        const key = `${resource}:list:${page}:${limit}`;
        body = await getOrSet(resource, key, run);
      } else {
        body = await run();
      }

      res.json(body);
    }),

    // GET /:id — один запис
    getById: asyncHandler(async (req, res) => {
      const item = await model.findUnique({
        where: { id: req.params.id },
        include: oneInclude,
      });
      if (!item) throw AppError.notFound(`${name} з id=${req.params.id} не знайдено`);
      res.json({ success: true, data: item });
    }),

    // POST / — створення
    create: asyncHandler(async (req, res) => {
      const item = await model.create({ data: req.body, include: oneInclude });
      announce(req, 'created', item.id);
      res.status(201).json({ success: true, data: item });
    }),

    // PUT/PATCH /:id — оновлення
    update: asyncHandler(async (req, res) => {
      const item = await model.update({
        where: { id: req.params.id },
        data: req.body,
        include: oneInclude,
      });
      announce(req, 'updated', item.id);
      res.json({ success: true, data: item });
    }),

    // DELETE /:id — видалення
    remove: asyncHandler(async (req, res) => {
      await model.delete({ where: { id: req.params.id } });
      announce(req, 'deleted', req.params.id);
      res.json({ success: true, message: `${name} з id=${req.params.id} видалено` });
    }),
  };
}

module.exports = createCrudController;
