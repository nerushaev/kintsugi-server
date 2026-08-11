const Order = require("../../models/order");
const { monoPay } = require("../../helpers");

const REUSABLE_PAYMENT_STATUSES = new Set([
  "unpaid",
  "created",
  "processing",
  "hold",
]);

const retryPayment = async (req, res) => {
  const { orderId } = req.params;
  const ownsOrder = (req.user.orders || []).some(
    (ownedOrderId) => String(ownedOrderId) === String(orderId)
  );

  if (req.user.role !== "admin" && !ownsOrder) {
    return res.status(404).json({ message: "Замовлення не знайдено" });
  }

  const order = await Order.findOne({ orderId });
  if (!order) {
    return res.status(404).json({ message: "Замовлення не знайдено" });
  }
  if (order.payments !== "card") {
    return res.status(400).json({ message: "Для цього замовлення обрано оплату при отриманні" });
  }
  if (order.paymentStatus === "success") {
    return res.status(409).json({ message: "Замовлення вже оплачено" });
  }
  if (order.status === "canceled") {
    return res.status(409).json({ message: "Скасоване замовлення неможливо оплатити" });
  }
  if (
    order.paymentUrl &&
    REUSABLE_PAYMENT_STATUSES.has(order.paymentStatus)
  ) {
    return res.json({ pageUrl: order.paymentUrl, reused: true });
  }
  if (order.paymentStatus === "creating") {
    return res.status(409).json({ message: "Посилання вже створюється. Спробуйте за кілька секунд" });
  }

  order.paymentStatus = "creating";
  await order.save();

  try {
    const invoice = await monoPay({
      amount: Math.round(Number(order.totalPrice) * 100),
      orderId: order.orderId,
    });
    order.paymentId = invoice.invoiceId;
    order.paymentUrl = invoice.pageUrl;
    order.paymentStatus = "unpaid";
    await order.save();

    return res.json({ pageUrl: invoice.pageUrl, reused: false });
  } catch (error) {
    order.paymentStatus = "invoice_failed";
    await order.save();
    console.error(`Order ${order.orderId}: retry payment invoice failed`, error.message);
    return res.status(502).json({ message: "Не вдалося створити посилання на оплату. Спробуйте ще раз" });
  }
};

module.exports = retryPayment;
