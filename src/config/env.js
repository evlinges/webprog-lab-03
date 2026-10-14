// Централізоване читання та перевірка змінних середовища.
// Якщо обовʼязкова змінна відсутня — застосунок не стартує з чіткою помилкою.
require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Відсутня обовʼязкова змінна середовища «${name}». ` +
        'Скопіюйте .env.example у .env та заповніть значення.'
    );
  }
  return value;
}

const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Адреса клієнта (для CORS WebSocket-з'єднань). На хостингу — домен фронтенду.
  frontendUrl: process.env.FRONTEND_URL || '*',

  // Налаштування JWT: окремі секрети для access- і refresh-токенів.
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },

  // Завантаження файлів.
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 5,
  },

  // Обмеження частоти запитів.
  rateLimit: {
    windowMin: Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  },
};

module.exports = config;
