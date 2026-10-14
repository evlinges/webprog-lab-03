// Маршрути аутентифікації. Документація кожного endpoint — у JSDoc-коментарях
// для Swagger (swagger-jsdoc збирає їх у специфікацію OpenAPI).
const { Router } = require('express');
const ctrl = require('../controllers/authController');
const validate = require('../utils/validate');
const v = require('../validators/auth.validator');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Реєстрація нового користувача
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email: { type: string, format: email, example: manager@rezanok.ua }
 *               password: { type: string, minLength: 8, example: superSecret1 }
 *               fullName: { type: string, example: Марія Менеджер }
 *     responses:
 *       201: { description: Користувача створено, повернуто пару токенів }
 *       409: { description: Пошта вже зареєстрована }
 *       400: { description: Помилка валідації }
 */
router.post('/register', authLimiter, validate(v.register), ctrl.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вхід за поштою та паролем
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: admin@rezanok.ua }
 *               password: { type: string, example: admin12345 }
 *     responses:
 *       200: { description: Успішний вхід, повернуто access- та refresh-токени }
 *       401: { description: Невірна пошта або пароль }
 */
router.post('/login', authLimiter, validate(v.login), ctrl.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Оновлення пари токенів за refresh-токеном (з ротацією)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Видано нову пару токенів, старий відкликано }
 *       401: { description: Недійсний, прострочений або вже використаний токен }
 */
router.post('/refresh', authLimiter, validate(v.refresh), ctrl.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Вихід — відкликання refresh-токена
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Вихід виконано (ідемпотентно) }
 */
router.post('/logout', validate(v.logout), ctrl.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Профіль поточного користувача
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Дані користувача }
 *       401: { description: Потрібна аутентифікація }
 */
router.get('/me', authenticate, ctrl.me);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Зміна паролю (усі сесії завершуються)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Пароль змінено }
 *       400: { description: Поточний пароль невірний }
 *       401: { description: Потрібна аутентифікація }
 */
router.post('/change-password', authenticate, validate(v.changePassword), ctrl.changePassword);

module.exports = router;
