// Маршрути сповіщень. Усі потребують аутентифікації.
const { Router } = require('express');
const ctrl = require('../controllers/notificationController');
const validate = require('../utils/validate');
const { idParam } = require('../validators/common');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Список своїх сповіщень
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: unread, schema: { type: boolean }, description: лише непрочитані }
 *       - { in: query, name: type, schema: { type: string, enum: [order, payment, production, system] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Список сповіщень із пагінацією }
 */
router.get('/', ctrl.list);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Кількість непрочитаних сповіщень
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ count }" }
 */
router.get('/unread-count', ctrl.unreadCount);

/**
 * @openapi
 * /api/notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Позначити всі сповіщення прочитаними
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Кількість позначених }
 */
router.post('/read-all', ctrl.markAllRead);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Позначити сповіщення прочитаним
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Оновлене сповіщення }
 *       404: { description: Не знайдено }
 */
router.patch('/:id/read', validate({ params: idParam }), ctrl.markRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Видалити сповіщення
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Видалено }
 *       404: { description: Не знайдено }
 */
router.delete('/:id', validate({ params: idParam }), ctrl.remove);

module.exports = router;
