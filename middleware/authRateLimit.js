const { rateLimit } = require("express-rate-limit");

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Забагато спроб. Спробуйте ще раз через 15 хвилин." },
});

const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Забагато запитів на оновлення сесії." },
});

module.exports = { authRateLimit, refreshRateLimit };
