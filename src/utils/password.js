// Хешування та перевірка паролів за допомогою Argon2id — сучасного алгоритму,
// що OWASP рекомендує для нових систем. На відміну від швидких хеш-функцій
// (SHA-256, MD5), він навмисно повільний і вимогливий до памʼяті, тому підбір
// паролів на GPU стає надто дорогим. Унікальна сіль генерується автоматично
// і зберігається всередині самого хеша.
const argon2 = require('argon2');

// Параметри вартості (помірні, достатні для навчального проєкту і швидких тестів).
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 МіБ
  timeCost: 2,
  parallelism: 1,
};

async function hashPassword(plain) {
  return argon2.hash(plain, OPTIONS);
}

async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Пошкоджений або несумісний хеш трактуємо як невдалу перевірку.
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
