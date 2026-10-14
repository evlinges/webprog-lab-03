// Налаштування Multer для завантаження файлів із валідацією типу та розміру.
//
// Безпека (важливо!): MIME-тип та оригінальне імʼя надходять від клієнта і їх
// легко підробити. Тому ми:
//   1) зберігаємо файл під ЗГЕНЕРОВАНИМ випадковим імʼям (не з імені клієнта),
//   2) перевіряємо одночасно MIME-тип і розширення за білим списком,
//   3) обмежуємо розмір і кількість файлів.
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const config = require('../config/env');
const AppError = require('../utils/AppError');

// Тека для збереження має існувати.
const uploadDir = path.resolve(process.cwd(), config.upload.dir);
fs.mkdirSync(uploadDir, { recursive: true });

// Білий список дозволених типів: пара «MIME + розширення».
const ALLOWED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Згенероване безпечне імʼя: випадкові байти + оригінальне розширення.
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ALLOWED[file.mimetype];
  if (!allowedExts || !allowedExts.includes(ext)) {
    return cb(
      AppError.badRequest(
        `Недозволений тип файлу: ${file.mimetype} (${ext}). ` +
          `Дозволені: ${Object.keys(ALLOWED).join(', ')}`
      )
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
    files: 10, // максимум файлів за один запит (для мультизавантаження)
  },
});

module.exports = { upload, uploadDir, ALLOWED };
