// Кореневий роутер API. Підключає перевірку стану та роути кожної сутності.
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../models/prisma');
const { authenticate } = require('../middleware/auth');

const router = Router();

// Перевірка стану сервера та зʼєднання з базою даних.
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'ok',
      db: 'connected',
      time: new Date().toISOString(),
    });
  })
);

// Аутентифікація та файли (ЛР2).
router.use('/auth', require('./authRoutes'));
router.use('/files', require('./fileRoutes'));

// Сповіщення реального часу (ЛР3).
router.use('/notifications', require('./notificationRoutes'));

// Доменні сутності захищені: доступ лише автентифікованим користувачам
// (authenticate), а видалення записів — лише адміністраторам (authorize('admin')
// всередині кожного роутера).
router.use('/clients', authenticate, require('./client.routes'));
router.use('/employees', authenticate, require('./employee.routes'));
router.use('/stock-items', authenticate, require('./stockItem.routes'));
router.use('/orders', authenticate, require('./order.routes'));
router.use('/order-items', authenticate, require('./orderItem.routes'));
router.use('/production-stages', authenticate, require('./productionStage.routes'));
router.use('/payments', authenticate, require('./payment.routes'));
router.use('/shipments', authenticate, require('./shipment.routes'));

module.exports = router;
