const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeAnalytics, buildPurchaseEvent } = require("../services/purchaseAnalytics");
const { createPurchaseAnalyticsWorker } = require("../services/purchaseAnalyticsWorker");

const paidOrder = () => ({
  orderId: "AB1234567890", status: "new", payments: "card", paymentStatus: "success",
  analytics: { clientId: "123.456", sessionId: "1788960000" }, analyticsConfirmedAt: new Date(),
  totalPrice: 350,
  products: [{ product_id: "100", product_name: "Перука", price: 10000, amount: 2 }],
  bundles: [{ bundle_id: "200", title: "Набір", price: 20000, newPrice: 15000, amount: 1 }],
  email: "private@example.com", phone: "+380000000000", address: { city: "Private" },
});

test("purchase uses authoritative totals, discounted items and no personal data", () => {
  const payload = buildPurchaseEvent(paidOrder());
  const event = payload.events[0];
  assert.equal(event.name, "purchase");
  assert.equal(event.params.value, 350);
  assert.equal(event.params.items[1].price, 150);
  assert.equal(event.params.transaction_id, "AB1234567890");
  assert.equal(payload.client_id, "123.456");
  assert.doesNotMatch(JSON.stringify(payload), /private|phone|address|email/i);
  assert.equal(buildPurchaseEvent({ ...paidOrder(), totalPrice: 351 }), null);
});

test("only confirmed payment or completed cash order counts; missing tracking IDs are not invented", () => {
  for (const paymentStatus of ["created", "processing", "hold", "failure", "reversed", "unpaid"]) {
    assert.equal(buildPurchaseEvent({ ...paidOrder(), paymentStatus }), null);
  }
  assert.equal(buildPurchaseEvent({ ...paidOrder(), status: "canceled" }), null);
  assert.equal(buildPurchaseEvent({ ...paidOrder(), payments: "cash", status: "new" }), null);
  assert.equal(buildPurchaseEvent({ ...paidOrder(), payments: "cash", status: "sent" }), null);
  assert.ok(buildPurchaseEvent({ ...paidOrder(), payments: "cash", status: "completed" }));
  assert.equal(buildPurchaseEvent({ ...paidOrder(), analytics: undefined }), null);
  assert.equal(sanitizeAnalytics({ clientId: "customer@example.com" }), undefined);
  assert.deepEqual(sanitizeAnalytics({ clientId: "123.456", sessionId: "bad", email: "private@example.com" }), { clientId: "123.456" });
});

test("delivery retry reuses transaction ID and cannot overlap", async () => {
  const order = paidOrder();
  let done = false;
  let leased = false;
  let failed = false;
  let failOnce = true;
  const requests = [];
  const worker = createPurchaseAnalyticsWorker({
    claim: async () => {
      if (done || leased || failed) return null;
      leased = true; return order;
    },
    send: async (payload) => {
      requests.push(payload);
      await worker(); // overlapping trigger must be ignored
      if (failOnce) { failOnce = false; throw new Error("timeout after delivery"); }
    },
    complete: async (_order, status) => { done = status === "sent"; leased = false; },
    retry: async () => { leased = false; failed = true; }, log: () => {},
  });
  await worker();
  assert.equal(done, false);
  failed = false;
  await worker();
  await worker();
  assert.equal(done, true);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
});

test("expired confirmations are not misreported as new purchases", async () => {
  let claimed = false;
  let status;
  const worker = createPurchaseAnalyticsWorker({
    claim: async () => {
      if (claimed) return null;
      claimed = true;
      return { ...paidOrder(), analyticsConfirmedAt: new Date(Date.now() - 73 * 3600000) };
    },
    complete: async (_order, result) => { status = result; },
    send: async () => assert.fail("must not send"), retry: async () => assert.fail("must not retry"),
  });
  await worker();
  assert.equal(status, "expired");
});
