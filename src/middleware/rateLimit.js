// Обмеження частоти запитів (rate limiting) — захист від перебору паролів і
// зловживання API. Два ліміти: загальний (на весь API) і суворіший для
// маршрутів аутентифікації.
const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const jsonMessage = (message) => ({
  success: false,
  error: { message },
});

// Загальний ліміт для всього API.
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMin * 60 * 1000,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Забагато запитів. Спробуйте пізніше.'),
});

// Суворіший ліміт для входу/реєстрації — ускладнює перебір паролів.
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMin * 60 * 1000,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Забагато спроб аутентифікації. Спробуйте пізніше.'),
});

module.exports = { apiLimiter, authLimiter };
