// Middleware валідації на основі Zod-схем. Приймає обʼєкт зі схемами для
// body, params та query. Валідовані (і приведені до типів) дані повертаються
// назад у req, тож контролери отримують уже безпечні значення.
const { ZodError } = require('zod');
const AppError = require('./AppError');

const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.') || '(root)',
        message: e.message,
      }));
      return next(AppError.badRequest('Помилка валідації вхідних даних', details));
    }
    return next(err);
  }
};

module.exports = validate;
