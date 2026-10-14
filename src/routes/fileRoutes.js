// Маршрути файлового сервісу. Усі потребують аутентифікації.
const { Router } = require('express');
const ctrl = require('../controllers/fileController');
const validate = require('../utils/validate');
const { idParam } = require('../validators/common');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = Router();

// Усі маршрути файлів доступні лише автентифікованим користувачам.
router.use(authenticate);

/**
 * @openapi
 * /api/files:
 *   get:
 *     tags: [Files]
 *     summary: Список файлів (свої; адміністратор бачить усі)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Список метаданих файлів із пагінацією }
 *   post:
 *     tags: [Files]
 *     summary: Завантаження одного файлу
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Файл завантажено }
 *       400: { description: Недозволений тип або відсутній файл }
 */
router.get('/', ctrl.list);
router.post('/', upload.single('file'), ctrl.uploadOne);

/**
 * @openapi
 * /api/files/bulk:
 *   post:
 *     tags: [Files]
 *     summary: Завантаження кількох файлів одночасно (до 10)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Файли завантажено }
 */
router.post('/bulk', upload.array('files', 10), ctrl.uploadMany);

/**
 * @openapi
 * /api/files/{id}/download:
 *   get:
 *     tags: [Files]
 *     summary: Завантажити (отримати) файл за id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Вміст файлу }
 *       403: { description: Чужий файл }
 *       404: { description: Файл не знайдено }
 */
router.get('/:id/download', validate({ params: idParam }), ctrl.download);

/**
 * @openapi
 * /api/files/{id}:
 *   delete:
 *     tags: [Files]
 *     summary: Видалити файл (власник або адміністратор)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Файл видалено }
 *       403: { description: Чужий файл }
 *       404: { description: Файл не знайдено }
 */
router.delete('/:id', validate({ params: idParam }), ctrl.remove);

module.exports = router;
