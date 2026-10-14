// Шар моделей даних. Самі моделі описані декларативно у prisma/schema.prisma,
// а тут ми надаємо іменований доступ до кожної з них через Prisma-делегати.
// Контролери працюють саме з цими моделями, а не напряму з prisma.
const prisma = require('./prisma');

module.exports = {
  prisma,
  Client: prisma.client,
  Employee: prisma.employee,
  StockItem: prisma.stockItem,
  Order: prisma.order,
  OrderItem: prisma.orderItem,
  ProductionStage: prisma.productionStage,
  Payment: prisma.payment,
  Shipment: prisma.shipment,
  OrderAssignment: prisma.orderAssignment,
  // Сутності ЛР2 (аутентифікація та файли)
  User: prisma.user,
  RefreshToken: prisma.refreshToken,
  File: prisma.file,
  ActivityLog: prisma.activityLog,
  // Сутності ЛР3 (сповіщення реального часу)
  Notification: prisma.notification,
};
