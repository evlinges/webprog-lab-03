// Точка входу: створення HTTP-сервера, під'єднання WebSocket (Socket.io) та
// коректне завершення роботи. У ЛР3 сервер обслуговує і REST API, і WebSocket
// на одному порту, тому HTTP-сервер створюється явно.
const { createServer } = require('node:http');
const app = require('./app');
const config = require('./config/env');
const prisma = require('./models/prisma');
const { initSocket } = require('./socket');

const httpServer = createServer(app);

// Ініціалізуємо Socket.io поверх HTTP-сервера та зберігаємо io в застосунку,
// щоб контролери могли надсилати події через req.app.get('io').
const io = initSocket(httpServer);
app.set('io', io);

const server = httpServer.listen(config.port, () => {
  console.log(`🚀 Сервер Rezanok API запущено: http://localhost:${config.port}`);
  console.log(`   Середовище: ${config.nodeEnv}`);
  console.log(`   Документація: http://localhost:${config.port}/api/docs`);
  console.log(`   WebSocket:    ws://localhost:${config.port} (Socket.io)`);
});

// Коректне закриття зʼєднань при зупинці процесу.
async function shutdown(signal) {
  console.log(`\n${signal} отримано — завершую роботу...`);
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Зʼєднання з базою закрито. Бувай!');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
