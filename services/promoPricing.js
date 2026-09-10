const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
const normalizeCode = (value) => {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^[A-Z0-9_-]{3,40}$/.test(value.trim().toUpperCase())) fail("Некоректний промокод");
  return value.trim().toUpperCase();
};
const calculatePricing = (products, bundles, promo, now = new Date()) => {
  const lines = [...products.map(p => [p.price, p.amount]), ...bundles.map(b => [b.newPrice, b.amount])];
  if (!lines.length || lines.some(([price, amount]) => !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(amount) || amount <= 0)) fail("Перевірте склад кошика");
  const subtotal = lines.reduce((sum, [price, amount]) => sum + price * amount, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal < 30000) fail("Мінімальна сума замовлення — 300 грн до знижки");
  if (promo) {
    if (!promo.active || !promo.startsAt || !promo.expiresAt || !Number.isFinite(new Date(promo.startsAt).getTime()) || !Number.isFinite(new Date(promo.expiresAt).getTime())) fail("Промокод неактивний");
    if (now < new Date(promo.startsAt)) fail("Промокод ще не діє");
    if (now >= new Date(promo.expiresAt)) fail("Термін дії промокоду закінчився");
    if (!Number.isInteger(promo.percent) || promo.percent < 1 || promo.percent >= 100) fail("Промокод неактивний");
  }
  const discount = promo ? Math.round(subtotal * promo.percent / 100) : 0;
  return { subtotalPrice: subtotal / 100, discountAmount: discount / 100, totalPrice: (subtotal - discount) / 100, promoCode: promo?.code || "", promoPercent: promo?.percent || 0 };
};
const priceOrder = async (products, bundles, input) => {
  const code = normalizeCode(input);
  const promo = code ? await require("../models/promoCode").findOne({ code }).lean() : null;
  if (code && !promo) fail("Промокод не знайдено");
  return calculatePricing(products, bundles, promo);
};
module.exports = { priceOrder, calculatePricing, normalizeCode };
