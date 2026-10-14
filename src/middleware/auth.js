// Middleware аутентифікації. Перевіряє access-токен із заголовка
// Authorization: Bearer <token>, підвантажує користувача з бази і кладе його
// у req.user. Якщо токена немає або він недійсний — 401.
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

// Дістає токен із заголовка Authorization.
function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

// Завантажує актуального користувача за payload токена (щоб заблокований
// користувач втратив доступ одразу, не чекаючи завершення терміну токена).
async function loadUser(payload) {
  if (payload.type !== 'access') return null;
  const user = await User.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) return null;
  return user;
}

// Обовʼязкова аутентифікація: без валідного токена далі не пускаємо.
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthorized('Потрібна аутентифікація: відсутній токен доступу');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Недійсний або прострочений токен доступу');
    }

    const user = await loadUser(payload);
    if (!user) throw AppError.unauthorized('Користувача не знайдено або він заблокований');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Необовʼязкова аутентифікація: якщо токен є і валідний — підставляє користувача,
// якщо немає — просто йде далі (req.user лишається undefined).
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const user = await loadUser(payload);
    if (user) req.user = user;
  } catch {
    // мовчки ігноруємо недійсний токен — це опційна аутентифікація
  }
  next();
}

module.exports = { authenticate, optionalAuth };
