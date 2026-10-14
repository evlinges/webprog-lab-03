// Обгортка для асинхронних обробників маршрутів: ловить відхилені Promise
// і передає помилку в next(), щоб не писати try/catch у кожному контролері.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
