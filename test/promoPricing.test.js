const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePricing, normalizeCode } = require("../services/promoPricing");
const { buildPurchaseEvent } = require("../services/purchaseAnalytics");
const now = new Date("2026-09-10T12:00:00Z");
const promo = { code: "KINTSUGI5", percent: 5, active: true, startsAt: now, expiresAt: new Date(now.getTime() + 14 * 86400000) };
test("normalization rejects object injection and invalid codes", () => {
  assert.equal(normalizeCode(" kintsugi5 "), "KINTSUGI5");
  assert.equal(normalizeCode(undefined), "");
  for (const v of [{ $ne: null }, 5, "a".repeat(41)]) assert.throws(() => normalizeCode(v));
});
test("products and bundles receive 5%, rounded once to kopecks", () => {
  const result = calculatePricing([{ price: 30001, amount: 3 }], [{ newPrice: 50000, amount: 2 }], promo, now);
  assert.equal(result.subtotalPrice, 1900.03);
  assert.equal(result.discountAmount, 95);
  assert.equal(result.totalPrice, 1805.03);
});
test("minimum applies before discount; ordinary orders unchanged", () => {
  assert.equal(calculatePricing([{ price: 30000, amount: 1 }], [], promo, now).totalPrice, 285);
  assert.equal(calculatePricing([{ price: 30000, amount: 1 }], [], null, now).totalPrice, 300);
  assert.throws(() => calculatePricing([{ price: 29999, amount: 1 }], [], promo, now));
});
test("disabled, unstarted and expired promotions rejected, expiry exclusive", () => {
  for (const p of [{...promo,active:false},{...promo,startsAt:null},{...promo,percent:100}]) assert.throws(() => calculatePricing([{price:30000,amount:1}],[],p,now));
  assert.throws(() => calculatePricing([{price:30000,amount:1}],[],promo,new Date(now.getTime()-1)));
  assert.throws(() => calculatePricing([{price:30000,amount:1}],[],promo,promo.expiresAt));
});
test("discounted purchase analytics reconcile even with quantity rounding", () => {
  const products = [{product_id:"1", product_name:"Test", price:30001,amount:3}];
  const pricing = calculatePricing(products, [], promo, now);
  const event = buildPurchaseEvent({...pricing, products, bundles:[], orderId:"TEST",analytics:{clientId:"123.456"},analyticsConfirmedAt:now,status:"completed",payments:"cash"});
  assert.ok(event);
  const params=event.events[0].params;
  assert.equal(params.coupon,"KINTSUGI5");
  assert.ok(Math.abs(params.items.reduce((s,i)=>s+i.price*i.quantity,0)-params.value)<0.001);
});

test("quote uses stored prices; unknown code rejected without any order writes", async () => {
  const Module = require("node:module");
  const original = Module._load;
  const stored = { product_id: "1", product_name: "Stored", price: 40000, amount: 10 };
  Module._load = function (name, parent, ...rest) {
    if (name === "../models/product") return { find: () => ({ lean: async () => [stored], select: () => ({ lean: async () => [stored] }) }) };
    if (name === "../models/bundle") return {};
    if (name === "../models/promoCode") return { findOne: ({code}) => ({ lean: async () => code === "KINTSUGI5" ? {...promo, startsAt:new Date(Date.now()-1000),expiresAt:new Date(Date.now()+60000)} : null }) };
    return original.call(this, name, parent, ...rest);
  };
  try {
    const quote = require("../controllers/orders/quoteOrder");
    let status = 200, body;
    const res = { status(n) {status=n;return this;}, json(v) {body=v;return this;} };
    await quote({body:{ products:[{product_id:"1",amount:1,price:1}],bundles:[],promoCode:"kintsugi5",discountAmount:399 }},res);
    assert.equal(status,200); assert.equal(body.totalPrice,380); assert.equal(body.discountAmount,20);
    await quote({body:{products:[{product_id:"1",amount:1}],promoCode:"UNKNOWN"}},res);
    assert.equal(status,400); assert.match(body.message,/не знайдено/);
  } finally { Module._load = original; }
});
