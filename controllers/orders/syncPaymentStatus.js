const axios = require("axios");
const Order = require("../../models/order");
const { sendPaymentNotifications } = require("../products/monobankWebhook");

const MONOBANK_STATUSES = new Set([
  "created",
  "processing",
  "hold",
  "success",
  "failure",
  "reversed",
  "expired",
]);

const syncPaymentStatus = async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) {
    return res.status(404).json({ message: "Замовлення не знайдено" });
  }
  if (order.payments !== "card" || !order.paymentId) {
    return res.status(400).json({ message: "Для замовлення немає рахунку Monobank" });
  }

  const token = process.env.MONOBANK_TOKEN;
  if (!token) {
    return res.status(503).json({ message: "Monobank не налаштовано на сервері" });
  }

  const statusUrl = process.env.MONOBANK_INVOICE_STATUS_URL ||
    "https://api.monobank.ua/api/merchant/invoice/status";
  const { data } = await axios.get(statusUrl, {
    params: { invoiceId: order.paymentId },
    headers: { "X-Token": token },
    timeout: 15000,
  });

  const expectedAmount = Math.round(Number(order.totalPrice) * 100);
  if (
    data?.invoiceId !== order.paymentId ||
    !MONOBANK_STATUSES.has(data?.status) ||
    (data.reference && data.reference !== order.orderId) ||
    (Number.isFinite(Number(data.amount)) && Number(data.amount) !== expectedAmount)
  ) {
    return res.status(502).json({ message: "Monobank повернув невідповідні дані рахунку" });
  }

  order.paymentStatus = data.status;
  await order.save();
  if (data.status === "success") {
    await sendPaymentNotifications(order);
  }

  return res.json({ order });
};

module.exports = syncPaymentStatus;
