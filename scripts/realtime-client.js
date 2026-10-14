// Демонстраційний WebSocket-клієнт. Підключається до сервера, автентифікується
// JWT-токеном, приєднується до кімнати замовлень і друкує всі події реального
// часу та персональні сповіщення, які надходять.
//
// Запуск (сервер має бути піднятий):
//   node scripts/realtime-client.js [email] [password]
// За замовчуванням використовує демо-адміністратора із seed.
const { io } = require('socket.io-client');

const BASE = process.env.API_URL || 'http://localhost:3000';
const email = process.argv[2] || 'admin@rezanok.ua';
const password = process.argv[3] || 'admin12345';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error('Не вдалося увійти: ' + JSON.stringify(json.error));
  return json.data;
}

(async () => {
  const { user, accessToken } = await login();
  console.log(`Увійшли як ${user.email} (роль ${user.role})`);

  const socket = io(BASE, { auth: { token: accessToken }, reconnection: true });

  socket.on('connect', async () => {
    console.log(`✅ Під'єднано до WebSocket (socket ${socket.id})`);
    const ack = await socket.emitWithAck('room:join', 'orders');
    console.log(`📥 Приєднано до кімнати:`, ack);
    console.log('Очікую подій (створіть/змініть замовлення в іншому вікні)...\n');
  });

  socket.on('connect_error', (err) => console.log('❌ Помилка підключення:', err.message));

  socket.on('presence:list', (d) => console.log('👥 Онлайн зараз:', d.online));
  socket.on('presence:update', (d) =>
    console.log(`👤 Користувач ${d.userId} ${d.online ? 'онлайн' : 'офлайн'}`)
  );

  socket.on('orders:changed', (d) =>
    console.log(`🔔 orders:changed → ${d.action} #${d.id} (seq ${d._seq})`)
  );
  socket.on('order:updated', (d) => console.log(`🔄 order:updated #${d.id} → ${d.status}`));
  socket.on('notification', (n) =>
    console.log(`📨 Сповіщення [${n.priority}] ${n.title}: ${n.body || ''}`)
  );

  process.on('SIGINT', () => {
    socket.close();
    process.exit(0);
  });
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
