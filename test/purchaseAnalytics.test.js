const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeAnalytics, buildPurchaseEvent, buildConfirmedOrderEvent, recordPurchaseConfirmation } = require("../services/purchaseAnalytics");
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

test("COD confirmation is separate from paid revenue and respects cancellation", () => {
  const order = { ...paidOrder(), payments: "cash", paymentStatus: undefined, orderConfirmedAt: new Date() };
  assert.equal(buildConfirmedOrderEvent({ ...order, status: "new" }), null);
  assert.equal(buildConfirmedOrderEvent({ ...order, status: "canceled" }), null);
  for (const status of ["processing", "sent", "shipped", "completed"]) {
    const event = buildConfirmedOrderEvent({ ...order, status }).events[0];
    assert.equal(event.name, "order_confirmed");
    assert.equal(event.params.value, 350);
    assert.equal(event.params.payment_method, "cash");
    assert.equal(event.params.transaction_id, order.orderId);
    assert.doesNotMatch(JSON.stringify(event), /private|phone|address|email/i);
  }
  assert.equal(buildPurchaseEvent({ ...order, status: "processing" }), null);
  assert.ok(buildPurchaseEvent({ ...order, status: "completed" }));
  assert.equal(buildConfirmedOrderEvent({ ...order, status: "processing", totalPrice: 351 }), null);
  assert.equal(buildConfirmedOrderEvent({ ...order, status: "processing", orderConfirmedAt: undefined }), null);
  assert.equal(buildConfirmedOrderEvent({ ...order, status: "processing", analytics: undefined }), null);
  assert.equal(buildConfirmedOrderEvent({ ...paidOrder(), paymentStatus: "unpaid", orderConfirmedAt: new Date() }), null);
});

test("order milestone persists once, does not backfill old orders or reset purchase delivery", async () => {
  const Order = require("../models/order");
  const original = Order.updateOne;
  const updates = [];
  const stored = {};
  Order.updateOne = async (query, update) => {
    updates.push({ query, update });
    for (const [field, value] of Object.entries(update.$set)) {
      assert.deepEqual(query[field], { $exists: false });
      if (!(field in stored)) stored[field] = value;
    }
  };
  try {
    const order = { ...paidOrder(), _id: "test", payments: "cash", status: "processing", orderConfirmationEnabled: true };
    await recordPurchaseConfirmation({ ...order, orderConfirmationEnabled: undefined });
    await recordPurchaseConfirmation({ ...order, status: "new" });
    await recordPurchaseConfirmation({ ...order, status: "canceled" });
    assert.equal(updates.length, 0);
    await recordPurchaseConfirmation(order);
    const first = stored.orderConfirmedAt;
    await recordPurchaseConfirmation({ ...order, status: "sent" });
    assert.equal(stored.orderConfirmedAt, first);
    assert.equal(stored.analyticsConfirmedAt, undefined);
    await recordPurchaseConfirmation({ ...order, status: "completed" });
    assert.ok(stored.analyticsConfirmedAt);
    assert.equal(stored.orderConfirmedAt, first);
    assert.ok(updates.every(({ update }) => !update.$set.analyticsSentAt && !update.$set.analyticsDeliveryStatus));
  } finally { Order.updateOne = original; }
});

test("confirmation worker sends the distinct event and retains its original identity on retry", async () => {
  const order = { ...paidOrder(), payments: "cash", status: "processing", orderConfirmedAt: new Date() };
  let available = true;
  const sent = [];
  const results = [];
  const worker = createPurchaseAnalyticsWorker({
    buildEvent: buildConfirmedOrderEvent,
    claim: async () => { if (!available) return null; available = false; return order; },
    send: async (event) => { sent.push(event); if (sent.length === 1) throw new Error("timeout"); },
    complete: async (_, status) => results.push(status),
    retry: async () => {}, log: () => {},
  });
  await worker();
  available = true;
  await worker();
  await worker();
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(sent[0].events[0].name, "order_confirmed");
  assert.deepEqual(results, ["sent"]);
});
