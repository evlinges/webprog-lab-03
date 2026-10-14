// Контролер аутентифікації: реєстрація, вхід, оновлення токенів (з ротацією),
// вихід, профіль та зміна паролю. Паролі зберігаються лише як Argon2id-хеші,
// refresh-токени — лише як SHA-256-хеші з можливістю відкликання.
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { hashPassword, verifyPassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt');
const { logActivity } = require('../utils/activityLog');
const { User, RefreshToken } = require('../models');

// Безпечне представлення користувача для відповіді — без хеша паролю.
function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
  };
}

// Видає нову пару токенів і зберігає хеш refresh-токена в базі.
async function issueTokens(user, req) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const decoded = jwt.decode(refreshToken); // містить exp (у секундах)

  const stored = await RefreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
      userAgent: (req.headers['user-agent'] || '').slice(0, 200) || null,
    },
  });

  return { accessToken, refreshToken, storedId: stored.id };
}

// POST /api/auth/register — реєстрація нового користувача.
const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  const exists = await User.findUnique({ where: { email } });
  if (exists) throw AppError.conflict('Користувач із такою поштою вже існує');

  const user = await User.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      fullName,
      // роль НІКОЛИ не береться з тіла запиту — завжди звичайний користувач
      role: 'user',
    },
  });

  const { accessToken, refreshToken } = await issueTokens(user, req);
  await logActivity({ userId: user.id, action: 'user.register', ip: req.ip });

  res.status(201).json({
    success: true,
    data: { user: publicUser(user), accessToken, refreshToken },
  });
});

// POST /api/auth/login — вхід за поштою та паролем.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findUnique({ where: { email } });
  // Та сама відповідь і для неіснуючої пошти, і для невірного паролю —
  // щоб не підказувати зловмиснику, які адреси зареєстровані.
  const ok = user && (await verifyPassword(user.passwordHash, password));
  if (!ok) {
    await logActivity({ action: 'user.login_failed', detail: email, ip: req.ip });
    throw AppError.unauthorized('Невірна пошта або пароль');
  }
  if (!user.active) throw AppError.forbidden('Обліковий запис заблоковано');

  const { accessToken, refreshToken } = await issueTokens(user, req);
  await logActivity({ userId: user.id, action: 'user.login', ip: req.ip });

  res.json({
    success: true,
    data: { user: publicUser(user), accessToken, refreshToken },
  });
});

// POST /api/auth/refresh — обмін дійсного refresh-токена на нову пару (ротація).
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // 1. Перевірка підпису та строку дії.
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Недійсний або прострочений refresh-токен');
  }

  // 2. Пошук збереженого хеша.
  const stored = await RefreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!stored) throw AppError.unauthorized('Refresh-токен не знайдено');

  // 3. Повторне використання вже відкликаного токена — ознака викрадення:
  //    відкликаємо ВСІ токени користувача.
  if (stored.revokedAt) {
    await RefreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logActivity({ userId: stored.userId, action: 'token.reuse_detected', ip: req.ip });
    throw AppError.unauthorized('Refresh-токен уже використано — усі сесії завершено');
  }

  if (stored.expiresAt < new Date()) {
    throw AppError.unauthorized('Термін дії refresh-токена вичерпано');
  }

  const user = await User.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) throw AppError.unauthorized('Користувача не знайдено або заблоковано');

  // 4. Ротація: видаємо нову пару, старий токен відкликаємо і звʼязуємо з новим.
  const { accessToken, refreshToken: newRefresh, storedId } = await issueTokens(user, req);
  await RefreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedById: storedId },
  });
  await logActivity({ userId: user.id, action: 'token.refresh', ip: req.ip });

  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefresh },
  });
});

// POST /api/auth/logout — відкликання конкретного refresh-токена.
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const stored = await RefreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });

  if (stored && !stored.revokedAt) {
    await RefreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    await logActivity({ userId: stored.userId, action: 'user.logout', ip: req.ip });
  }

  // Ідемпотентно: навіть якщо токена вже не було, повертаємо успіх.
  res.json({ success: true, message: 'Вихід виконано' });
});

// GET /api/auth/me — профіль поточного користувача (потрібна аутентифікація).
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: publicUser(req.user) });
});

// POST /api/auth/change-password — зміна паролю з перевіркою поточного.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const ok = await verifyPassword(req.user.passwordHash, currentPassword);
  if (!ok) throw AppError.badRequest('Поточний пароль вказано невірно');

  await User.update({
    where: { id: req.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Після зміни паролю завершуємо всі активні сесії (відкликаємо refresh-токени).
  await RefreshToken.updateMany({
    where: { userId: req.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await logActivity({ userId: req.user.id, action: 'user.change_password', ip: req.ip });

  res.json({ success: true, message: 'Пароль змінено. Увійдіть повторно.' });
});

module.exports = { register, login, refresh, logout, me, changePassword };
