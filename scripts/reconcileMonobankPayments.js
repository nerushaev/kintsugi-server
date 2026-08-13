const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const axios = require("axios");
const mongoose = require("mongoose");
const Order = require("../models/order");

const APPLY = process.argv.includes("--apply");
const MARK_EXISTING_PAID = process.argv.includes("--mark-existing-paid");
const STATUSES = new Set([
  "created",
  "processing",
  "hold",
  "success",
  "failure",
  "reversed",
  "expired",
]);
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const run = async () => {
  const { DB_HOST, MONOBANK_TOKEN } = process.env;
  if (!DB_HOST || (!MONOBANK_TOKEN && !MARK_EXISTING_PAID)) {
    throw new Error("DB_HOST and MONOBANK_TOKEN are required");
  }

  await mongoose.connect(DB_HOST);
  if (MARK_EXISTING_PAID) {
    const result = await Order.updateMany(
      { payments: "card", paymentStatus: { $ne: "success" } },
      { $set: { paymentStatus: "success" } }
    );
    console.log(JSON.stringify({
      mode: "mark-existing-paid",
      matched: result.matchedCount,
      changed: result.modifiedCount,
      emailsSent: 0,
    }, null, 2));
    return;
  }
  const orders = await Order.find({
    payments: "card",
    paymentId: { $exists: true, $nin: [null, ""] },
  }).select("orderId paymentId paymentStatus totalPrice");

  const statusUrl = process.env.MONOBANK_INVOICE_STATUS_URL ||
    "https://api.monobank.ua/api/merchant/invoice/status";
  const totals = { checked: 0, changed: 0, success: 0, skipped: 0, failed: 0 };

  for (const order of orders) {
    try {
      const { data } = await axios.get(statusUrl, {
        params: { invoiceId: order.paymentId },
        headers: { "X-Token": MONOBANK_TOKEN },
        timeout: 15000,
      });
      totals.checked += 1;

      const expectedAmount = Math.round(Number(order.totalPrice) * 100);
      const isMatching = data?.invoiceId === order.paymentId &&
        STATUSES.has(data?.status) &&
        (!data.reference || data.reference === order.orderId) &&
        (!Number.isFinite(Number(data.amount)) || Number(data.amount) === expectedAmount);
      if (!isMatching) {
        totals.skipped += 1;
        console.warn(`${order.orderId}: skipped because invoice data does not match`);
        continue;
      }

      if (data.status === "success") totals.success += 1;
      if (order.paymentStatus !== data.status) {
        totals.changed += 1;
        console.log(`${order.orderId}: ${order.paymentStatus || "missing"} -> ${data.status}${APPLY ? "" : " (dry run)"}`);
        if (APPLY) {
          await Order.updateOne(
            { _id: order._id, paymentId: order.paymentId },
            { $set: { paymentStatus: data.status } }
          );
        }
      }
    } catch (error) {
      totals.failed += 1;
      console.error(`${order.orderId}: ${error.response?.status || error.code || error.message}`);
    }

    await pause(250);
  }

  const withoutInvoice = await Order.countDocuments({
    payments: "card",
    $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: "" }],
  });
  console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", ...totals, withoutInvoice }, null, 2));
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
