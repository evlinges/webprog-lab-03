// Централізована обробка помилок. Один middleware перетворює будь-яку помилку
// (операційну, Prisma або несподівану) на охайну JSON-відповідь із коректним
// HTTP-статусом. Реєструється ОСТАННІМ у ланцюжку middleware.
const { Prisma } = require('@prisma/client');
const { MulterError } = require('multer');
const config = require('../config/env');

// Маршрут не знайдено (404) — спрацьовує, якщо жоден роут не підійшов.
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: { message: `Маршрут не знайдено: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Внутрішня помилка сервера';
  let details = err.details;

  // Відомі помилки Prisma перекладаємо у зрозумілі HTTP-коди.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025': // операція над неіснуючим записом
        statusCode = 404;
        message = 'Запис не знайдено';
        break;
      case 'P2002': // порушення унікального обмеження
        statusCode = 409;
        message = `Порушення унікальності: поле ${err.meta?.target}`;
        break;
      case 'P2003': // порушення зовнішнього ключа
        statusCode = 400;
        message = 'Посилання на неіснуючий повʼязаний запис';
        break;
      default:
        statusCode = 400;
        message = `Помилка бази даних (код ${err.code})`;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Некоректна структура даних для запиту до бази';
  } else if (err instanceof MulterError) {
    // Помилки завантаження файлів (завеликий файл, забагато файлів тощо).
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `Файл завеликий (максимум ${config.upload.maxFileSizeMb} МБ)`;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Перевищено дозволену кількість файлів';
    } else {
      message = `Помилка завантаження файлу: ${err.message}`;
    }
  }

  // Непередбачені помилки логуємо на сервері.
  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  const body = { success: false, error: { message } };
  if (details) body.error.details = details;
  if (config.nodeEnv === 'development' && statusCode >= 500) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
