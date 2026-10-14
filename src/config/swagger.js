// Конфігурація Swagger / OpenAPI. swagger-jsdoc збирає JSDoc-коментарі
// (@openapi) з файлів маршрутів у специфікацію, а swagger-ui-express віддає
// інтерактивний інтерфейс за адресою /api/docs.
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('node:path');
const config = require('./env');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Rezanok API — ЛР3',
    version: '3.0.0',
    description:
      'REST API системи обліку замовлень майстерні нагород «Rezanok». ' +
      'ЛР3: оновлення в реальному часі (WebSocket/Socket.io), сповіщення, ' +
      'оптимізація БД (індекси, усунення N+1, кешування) та розгортання. ' +
      'Поверх ЛР2 (JWT + Argon2id, RBAC, файли).',
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Локальний сервер' }],
  components: {
    securitySchemes: {
      // Авторизація через заголовок Authorization: Bearer <access-token>.
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Реєстрація, вхід, токени, профіль' },
    { name: 'Notifications', description: 'Сповіщення реального часу' },
    { name: 'Files', description: 'Завантаження та керування файлами' },
    { name: 'Clients', description: 'Клієнти майстерні' },
    { name: 'Orders', description: 'Замовлення' },
  ],
};

const options = {
  definition,
  // Звідки брати анотації: усі файли маршрутів.
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
