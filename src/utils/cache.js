// Простий кеш у пам'яті з TTL та інвалідацією за простором імен (ресурсом).
// Застосовується до списків рідко змінюваних даних (працівники, склад), щоб
// не навантажувати БД однаковими запитами. При будь-якій зміні ресурсу його
// кеш скидається (announce → invalidate у crudController).
//
// На продакшні цю роль виконував би Redis (рівень 3) — інтерфейс навмисно
// простий, щоб його можна було замінити на Redis без зміни контролерів.
const store = new Map(); // key -> { value, expires, namespace }
const DEFAULT_TTL = 30_000; // 30 секунд

// Повертає значення з кешу або обчислює його через producer і кешує.
async function getOrSet(namespace, key, producer, ttl = DEFAULT_TTL) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value;

  const value = await producer();
  store.set(key, { value, expires: now + ttl, namespace });
  return value;
}

// Скидає всі записи кешу, що належать вказаному ресурсу.
function invalidate(namespace) {
  for (const [key, entry] of store) {
    if (entry.namespace === namespace) store.delete(key);
  }
}

function clear() {
  store.clear();
}

module.exports = { getOrSet, invalidate, clear };
