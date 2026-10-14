const { z } = require('zod');

const email = z.string().email('Некоректна адреса електронної пошти').max(200);
// Пароль: щонайменше 8 символів. Для навчального проєкту достатньо довжини;
// у реальній системі додають вимоги до складності.
const password = z.string().min(8, 'Пароль має містити щонайменше 8 символів').max(128);

const registerBody = z.object({
  email,
  password,
  fullName: z.string().min(1, 'Імʼя обовʼязкове').max(200),
});

const loginBody = z.object({
  email,
  password: z.string().min(1, 'Пароль обовʼязковий'),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1, 'refreshToken обовʼязковий'),
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Поточний пароль обовʼязковий'),
  newPassword: password,
});

module.exports = {
  register: { body: registerBody },
  login: { body: loginBody },
  refresh: { body: refreshBody },
  logout: { body: refreshBody },
  changePassword: { body: changePasswordBody },
};
