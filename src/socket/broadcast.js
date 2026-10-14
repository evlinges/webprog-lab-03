// Єдина точка розсилки подій реального часу. Окрім самої розсилки в кімнату,
// записує подію в історію (для відновлення після перепідключення) і додає до
// корисного навантаження службові поля _seq та _at.
//
// io може бути відсутнім (напр. у юніт-тестах без WebSocket) — тоді функція
// просто нічого не робить, не ламаючи основну логіку контролера.
function broadcast(io, room, event, payload = {}) {
  if (!io) return null;
  const entry = io.history.record(room, event, payload);
  io.to(room).emit(event, { ...payload, _seq: entry.seq, _at: entry.at });
  return entry;
}

// Дістає екземпляр io, збережений у застосунку (app.set('io', ...)).
function ioFrom(req) {
  return req.app.get('io');
}

module.exports = { broadcast, ioFrom };
