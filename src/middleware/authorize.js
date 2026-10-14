// Middleware авторизації (RBAC). Пропускає далі лише користувачів, чия роль
// входить до переліку дозволених. Використовується ПІСЛЯ authenticate, тож
// покладається на вже заповнений req.user.
//
// Приклад: router.delete('/:id', authenticate, authorize('admin'), ctrl.remove)
const AppError = require('../utils/AppError');

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Потрібна аутентифікація'));
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return next(
        AppError.forbidden('Недостатньо прав для виконання цієї дії')
      );
    }
    next();
  };
}

module.exports = authorize;
