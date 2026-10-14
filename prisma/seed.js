// Наповнення бази демонстраційними даними предметної області Rezanok.
// Запуск: npm run seed
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/utils/password');

const prisma = new PrismaClient();

async function main() {
  console.log('Очищення таблиць...');
  // Порядок важливий через зовнішні ключі.
  await prisma.activityLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
  await prisma.orderAssignment.deleteMany();
  await prisma.productionStage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.client.deleteMany();

  console.log('Створення користувачів системи...');
  // Два демо-облікові записи для перевірки аутентифікації/авторизації.
  // Паролі зберігаються лише як Argon2id-хеші.
  await prisma.user.create({
    data: {
      email: 'admin@rezanok.ua',
      passwordHash: await hashPassword('admin12345'),
      fullName: 'Адміністратор системи',
      role: 'admin',
    },
  });
  await prisma.user.create({
    data: {
      email: 'manager@rezanok.ua',
      passwordHash: await hashPassword('manager12345'),
      fullName: 'Менеджер майстерні',
      role: 'user',
    },
  });

  console.log('Створення працівників...');
  const [serhii, anna, olia, yura] = await Promise.all([
    prisma.employee.create({
      data: { fullName: 'Сергій Різник', role: 'admin', color: '#DC2626', initials: 'СР' },
    }),
    prisma.employee.create({
      data: { fullName: 'Анна Ткач', role: 'manager', color: '#2563EB', initials: 'АТ' },
    }),
    prisma.employee.create({
      data: { fullName: 'Оля Малюк', role: 'designer', color: '#7C3AED', initials: 'ОМ' },
    }),
    prisma.employee.create({
      data: { fullName: 'Юрій Коваль', role: 'production', color: '#059669', initials: 'ЮК' },
    }),
  ]);

  console.log('Створення складу заготовок...');
  const medal70 = await prisma.stockItem.create({
    data: { groupName: 'Круглі', label: 'Медаль кругла', dims: '70×67 мм', qty: 210, lowThreshold: 50, price: 32 },
  });
  const medal50 = await prisma.stockItem.create({
    data: { groupName: 'Круглі', label: 'Медаль кругла', dims: '50×48 мм', qty: 156, lowThreshold: 40, price: 24 },
  });
  const square80 = await prisma.stockItem.create({
    data: { groupName: 'Квадрати', label: 'Квадрат з вирізом', dims: '80×80 мм', qty: 120, lowThreshold: 30, price: 42 },
  });
  const cup = await prisma.stockItem.create({
    data: { groupName: 'Нагороди', label: 'Кубок великий', dims: '22×27 см', qty: 12, lowThreshold: 5, price: 480 },
  });
  const plaque = await prisma.stockItem.create({
    data: { groupName: 'Плакетки', label: 'Плакетка Амарант', dims: '15×20 см', qty: 8, lowThreshold: 5, price: 260 },
  });

  console.log('Створення клієнтів...');
  const titan = await prisma.client.create({
    data: { name: 'Спортклуб «Титан»', phone: '+380671112233', source: 'referral', note: 'Постійний клієнт, турніри' },
  });
  const maria = await prisma.client.create({
    data: { name: 'Марія Іваненко', phone: '+380509876543', source: 'instagram' },
  });
  const dynamo = await prisma.client.create({
    data: { name: 'ФК «Динамо-Юніор»', phone: '+380631234567', source: 'repeat' },
  });

  console.log('Створення замовлень...');

  // Замовлення 1 — терміновий турнірний комплект медалей.
  const order1 = await prisma.order.create({
    data: {
      clientId: titan.id,
      status: 'work',
      source: 'referral',
      urgent: true,
      discount: 5,
      deadline: new Date('2026-10-05'),
      note: 'Турнір з боротьби, потрібно до суботи',
      items: {
        create: [
          { type: 'Медаль', qty: 50, price: 45, discount: 0, details: 'Золото, стрічка патріотична', stockItemId: medal70.id, sortOrder: 0 },
          { type: 'Медаль', qty: 30, price: 38, discount: 0, details: 'Срібло', stockItemId: medal50.id, sortOrder: 1 },
          { type: 'Кубок', qty: 3, price: 480, discount: 10, details: 'Гравірування переможцям', stockItemId: cup.id, sortOrder: 2 },
        ],
      },
      payments: {
        create: [
          { amount: 2000, method: 'card', sender: 'Титан', purpose: 'Завдаток' },
        ],
      },
      shipment: {
        create: { method: 'Нова Пошта', address: 'Київ, відділення №12', ttn: '20450012345678', notes: 'Подзвонити за годину' },
      },
      assignments: {
        create: [
          { employeeId: anna.id, role: 'manager' },
          { employeeId: olia.id, role: 'designer' },
          { employeeId: yura.id, role: 'production' },
        ],
      },
    },
    include: { items: true },
  });

  // Виробничі стадії для першої позиції замовлення 1.
  const firstItem = order1.items[0];
  await prisma.productionStage.createMany({
    data: [
      { orderItemId: firstItem.id, stage: 'Друк', status: 'done', executorId: olia.id },
      { orderItemId: firstItem.id, stage: 'Різка', status: 'in_progress', executorId: yura.id },
      { orderItemId: firstItem.id, stage: 'Запайка', status: 'pending' },
    ],
  });

  // Замовлення 2 — нове, одна плакетка.
  await prisma.order.create({
    data: {
      clientId: maria.id,
      status: 'new',
      source: 'instagram',
      note: 'Подарунок керівнику',
      items: {
        create: [
          { type: 'Плакетка', qty: 1, price: 350, details: 'Дерево, гравіювання тексту', stockItemId: plaque.id },
        ],
      },
      assignments: { create: [{ employeeId: anna.id, role: 'manager' }] },
    },
  });

  // Замовлення 3 — виконане й повністю оплачене.
  await prisma.order.create({
    data: {
      clientId: dynamo.id,
      status: 'done',
      source: 'repeat',
      discount: 0,
      deadline: new Date('2026-09-20'),
      items: {
        create: [
          { type: 'Медаль', qty: 100, price: 30, stockItemId: medal50.id, sortOrder: 0 },
          { type: 'Нагорода', qty: 2, price: 620, details: 'Металева, порошкове фарбування', sortOrder: 1 },
        ],
      },
      payments: {
        create: [
          { amount: 3000, method: 'card', purpose: 'Завдаток' },
          { amount: 4240, method: 'bank', purpose: 'Доплата' },
        ],
      },
      shipment: { create: { method: 'Самовивіз', address: 'Майстерня', ttn: null } },
      assignments: {
        create: [
          { employeeId: anna.id, role: 'manager' },
          { employeeId: yura.id, role: 'production' },
        ],
      },
    },
  });

  // Підсумок
  const counts = {
    users: await prisma.user.count(),
    employees: await prisma.employee.count(),
    clients: await prisma.client.count(),
    stockItems: await prisma.stockItem.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    productionStages: await prisma.productionStage.count(),
    payments: await prisma.payment.count(),
    shipments: await prisma.shipment.count(),
    assignments: await prisma.orderAssignment.count(),
  };
  console.log('Готово! Створено записів:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
