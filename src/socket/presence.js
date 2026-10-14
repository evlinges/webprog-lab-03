// Відстеження онлайн-статусу користувачів. Один користувач може мати кілька
// відкритих вкладок/пристроїв (кілька сокетів), тому лічимо сокети на кожного:
// користувач «онлайн», доки відкрито хоча б один сокет.
class Presence {
  constructor() {
    this.sockets = new Map(); // userId -> Set(socketId)
  }

  // Додає сокет. Повертає true, якщо користувач ТІЛЬКИ-НО став онлайн
  // (це перший його сокет) — тоді варто розіслати всім presence:update.
  add(userId, socketId) {
    let set = this.sockets.get(userId);
    const wasOffline = !set || set.size === 0;
    if (!set) {
      set = new Set();
      this.sockets.set(userId, set);
    }
    set.add(socketId);
    return wasOffline;
  }

  // Прибирає сокет. Повертає true, якщо користувач став офлайн (закрито останній).
  remove(userId, socketId) {
    const set = this.sockets.get(userId);
    if (!set) return false;
    set.delete(socketId);
    if (set.size === 0) {
      this.sockets.delete(userId);
      return true;
    }
    return false;
  }

  isOnline(userId) {
    const set = this.sockets.get(userId);
    return !!set && set.size > 0;
  }

  // Список id користувачів, які зараз онлайн.
  list() {
    return [...this.sockets.keys()];
  }
}

module.exports = Presence;
