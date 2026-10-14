// Контролер файлового сервісу. Самі файли зберігаються у теці uploads/ під
// згенерованими іменами, а в базі — лише метадані та власник. Видаляти/
// завантажувати чужі файли може лише адміністратор.
const path = require('node:path');
const fs = require('node:fs/promises');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { File } = require('../models');
const { uploadDir } = require('../middleware/upload');
const { getPagination, buildMeta } = require('../utils/pagination');
const { logActivity } = require('../utils/activityLog');

function publicFile(f) {
  return {
    id: f.id,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    ownerId: f.ownerId,
    createdAt: f.createdAt,
    url: `/api/files/${f.id}/download`,
  };
}

// Записує метадані одного завантаженого Multer-файлу в базу.
async function persist(file, userId) {
  return File.create({
    data: {
      ownerId: userId,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    },
  });
}

// POST /api/files — завантаження одного файлу (поле форми "file").
const uploadOne = asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.badRequest('Файл не надіслано (очікується поле "file")');
  const record = await persist(req.file, req.user.id);
  await logActivity({ userId: req.user.id, action: 'file.upload', detail: record.originalName, ip: req.ip });
  res.status(201).json({ success: true, data: publicFile(record) });
});

// POST /api/files/bulk — завантаження кількох файлів (поле форми "files").
const uploadMany = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw AppError.badRequest('Файли не надіслано (очікується поле "files")');
  }
  const records = [];
  for (const f of req.files) records.push(await persist(f, req.user.id));
  await logActivity({ userId: req.user.id, action: 'file.upload_many', detail: `${records.length} файл(ів)`, ip: req.ip });
  res.status(201).json({ success: true, data: records.map(publicFile) });
});

// GET /api/files — список файлів із пагінацією. Звичайний користувач бачить
// лише свої файли, адміністратор — усі (з опційним фільтром ?ownerId=).
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = getPagination(req.query);

  const where = {};
  if (req.user.role === 'admin') {
    if (req.query.ownerId) where.ownerId = Number(req.query.ownerId);
  } else {
    where.ownerId = req.user.id;
  }
  if (req.query.search) {
    where.originalName = { contains: req.query.search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    File.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    File.count({ where }),
  ]);

  res.json({ success: true, data: data.map(publicFile), meta: buildMeta(page, limit, total) });
});

// Дістає файл і перевіряє права доступу (власник або адміністратор).
async function findAccessible(id, user) {
  const file = await File.findUnique({ where: { id } });
  if (!file) throw AppError.notFound(`Файл з id=${id} не знайдено`);
  if (user.role !== 'admin' && file.ownerId !== user.id) {
    throw AppError.forbidden('Доступ до чужого файлу заборонено');
  }
  return file;
}

// GET /api/files/:id/download — завантаження (віддача) файлу.
const download = asyncHandler(async (req, res) => {
  const file = await findAccessible(req.params.id, req.user);
  res.download(path.join(uploadDir, file.storedName), file.originalName);
});

// DELETE /api/files/:id — видалення файлу з диска та бази.
const remove = asyncHandler(async (req, res) => {
  const file = await findAccessible(req.params.id, req.user);
  await fs.unlink(path.join(uploadDir, file.storedName)).catch(() => {
    // Якщо файлу вже немає на диску — не заважаємо видалити запис із бази.
  });
  await File.delete({ where: { id: file.id } });
  await logActivity({ userId: req.user.id, action: 'file.delete', detail: file.originalName, ip: req.ip });
  res.json({ success: true, message: `Файл з id=${file.id} видалено` });
});

module.exports = { uploadOne, uploadMany, list, download, remove };
