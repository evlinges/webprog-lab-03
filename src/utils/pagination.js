// Хелпери для посторінкового виведення списків.

// Обчислює параметри пагінації зі query-рядка (?page=&limit=).
function getPagination(query, { maxLimit = 100, defaultLimit = 20 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

// Формує метадані для відповіді (загальна кількість, кількість сторінок).
function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { getPagination, buildMeta };
