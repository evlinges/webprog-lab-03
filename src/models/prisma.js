// Єдиний екземпляр PrismaClient на весь застосунок (патерн singleton).
// Кілька екземплярів вичерпали б пул зʼєднань до PostgreSQL.
const { PrismaClient } = require('@prisma/client');
const config = require('../config/env');

const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
