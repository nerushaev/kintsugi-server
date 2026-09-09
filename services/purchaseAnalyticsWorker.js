const { randomUUID } = require("node:crypto");
const { buildPurchaseEvent } = require("./purchaseAnalytics");

// Stored order state is the outbox. Lease + stable transaction_id protect against
// concurrent workers, restarts and a timeout after Google received the request.
const createPurchaseAnalyticsWorker = ({ claim, complete, retry, send, log = console.log }) => {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      for (let i = 0; i < 20; i++) {
        const order = await claim();
        if (!order) break;
        try {
          const event = buildPurchaseEvent(order);
          if (!event) { await complete(order, "invalid_payload"); continue; }
          // GA4 accepts backdated events for up to 72 hours. Keep original time.
          if (Date.now() - event.timestamp_micros / 1000 > 72 * 60 * 60 * 1000) {
            await complete(order, "expired"); continue;
          }
          await send(event);
          await complete(order, "sent");
        } catch {
          await retry(order);
          log(JSON.stringify({ worker: "purchase-analytics", status: "retry", orderId: order.orderId }));
        }
      }
    } catch {
      log("Purchase analytics worker failed; will retry without blocking orders.");
    } finally { running = false; }
  };
};

let timer;
const startPurchaseAnalyticsWorker = () => {
  if (timer) return;
  const measurementId = process.env.GA4_MEASUREMENT_ID || "G-7ZDB3JLFTP";
  const secret = process.env.GA4_API_SECRET;
  if (!secret || !/^G-[A-Z0-9]+$/.test(measurementId)) {
    console.warn("Purchase analytics paused: configure GA4_API_SECRET and GA4_MEASUREMENT_ID.");
    return;
  }
  const Order = require("../models/order");
  const axios = require("axios");
  const worker = createPurchaseAnalyticsWorker({
    claim: async () => {
      const now = new Date();
      return Order.findOneAndUpdate({
        "analytics.clientId": { $exists: true }, analyticsConfirmedAt: { $exists: true },
        analyticsDeliveryStatus: { $nin: ["sent", "expired", "invalid_payload"] },
        status: { $ne: "canceled" },
        $and: [
          { $or: [{ payments: "card", paymentStatus: "success" }, { payments: "cash", status: "completed" }] },
          { $or: [{ analyticsNextAttemptAt: { $exists: false } }, { analyticsNextAttemptAt: { $lte: now } }] },
          { $or: [{ analyticsLockedUntil: { $exists: false } }, { analyticsLockedUntil: { $lte: now } }] },
        ],
      }, {
        $set: { analyticsLockedUntil: new Date(Date.now() + 120000), analyticsLease: randomUUID() },
        $inc: { analyticsAttempts: 1 },
      }, { new: true, sort: { analyticsConfirmedAt: 1 } }).lean();
    },
    complete: (order, status) => Order.updateOne({ _id: order._id, analyticsLease: order.analyticsLease }, {
      $set: { analyticsDeliveryStatus: status, ...(status === "sent" && { analyticsSentAt: new Date() }) },
      $unset: { analyticsLockedUntil: 1, analyticsLease: 1, analyticsNextAttemptAt: 1 },
    }),
    retry: (order) => Order.updateOne({ _id: order._id, analyticsLease: order.analyticsLease }, {
      $set: { analyticsNextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(order.analyticsAttempts || 1, 6))) },
      $unset: { analyticsLockedUntil: 1, analyticsLease: 1 },
    }),
    send: (event) => axios.post("https://www.google-analytics.com/mp/collect", event, {
      params: { measurement_id: measurementId, api_secret: secret }, timeout: 15000, maxRedirects: 0,
    }),
  });
  timer = setInterval(worker, 60000);
  timer.unref();
  void worker();
};

module.exports = { createPurchaseAnalyticsWorker, startPurchaseAnalyticsWorker };
