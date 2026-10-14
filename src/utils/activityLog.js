// Журналювання дій користувачів (рівень 3). Пише запис у таблицю activity_logs.
// Навмисно «м'яке»: помилка журналювання не повинна валити основний запит,
// тому помилки лише логуються в консоль, а не прокидаються далі.
const { ActivityLog } = require('../models');

async function logActivity({ userId = null, action, detail = null, ip = null }) {
  try {
    await ActivityLog.create({ data: { userId, action, detail, ip } });
  } catch (err) {
    console.error('[activityLog] не вдалося записати подію:', action, err.message);
  }
}

module.exports = { logActivity };
