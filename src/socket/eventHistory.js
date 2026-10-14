// Історія подій реального часу для відновлення після втрати з'єднання.
// Кожна розіслана подія отримує наскрізний номер (seq). Клієнт запам'ятовує
// останній отриманий seq по кожній кімнаті; після перепідключення він надсилає
// ці «курсори», а сервер повертає всі події, що він пропустив.
//
// Сховище — у пам'яті з обмеженням на кількість подій у кімнаті (кільцевий
// буфер). Для навчального проєкту цього достатньо; на продакшні цю роль
// виконував би Redis (рівень 3).
class EventHistory {
  constructor(maxPerRoom = 200) {
    this.maxPerRoom = maxPerRoom;
    this.rooms = new Map(); // room -> [{ seq, event, payload, at }]
    this.seq = 0;
  }

  // Записує подію в історію кімнати й повертає запис із присвоєним seq.
  record(room, event, payload) {
    this.seq += 1;
    const entry = { seq: this.seq, event, payload, at: new Date().toISOString() };
    let arr = this.rooms.get(room);
    if (!arr) {
      arr = [];
      this.rooms.set(room, arr);
    }
    arr.push(entry);
    if (arr.length > this.maxPerRoom) arr.shift();
    return entry;
  }

  // Повертає всі події кімнати з seq, більшим за вказаний курсор.
  since(room, cursor = 0) {
    const arr = this.rooms.get(room) || [];
    return arr.filter((e) => e.seq > cursor);
  }
}

module.exports = EventHistory;
