// Робота з JWT-токенами. Використовуємо дві окремі пари «секрет + час життя»:
//   access  — короткоживучий (15 хв), передається у заголовку Authorization;
//   refresh — довгоживучий (7 днів), служить лише для отримання нової пари.
// Різні секрети гарантують, що refresh-токен не можна видати за access і навпаки.
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Access-токен несе мінімум даних: id користувача та його роль (для RBAC).
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

// Refresh-токен містить ще випадковий jti, щоб два токени одного користувача,
// видані в один момент, гарантовано відрізнялися (різний хеш у базі).
function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  return jwt.sign({ sub: user.id, type: 'refresh', jti }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

// У базі зберігаємо не сам refresh-токен, а його SHA-256-хеш. Навіть за витоку
// таблиці зловмисник не отримає робочих токенів.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
