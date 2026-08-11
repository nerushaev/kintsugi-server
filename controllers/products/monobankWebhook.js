const crypto = require("crypto");
const Order = require("../../models/order");
const { transport } = require("../../middleware");

const {
  adminOrderEmails,
  emailDetails,
  emailLayout,
  formatMoney,
  mailFrom,
} = require("../../helpers/emailTemplates");
const MONOBANK_PUBLIC_KEY =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFc05mWXpNR1hIM2VXVHkzWnFuVzVrM3luVG5CYgpnc3pXWnhkOStObEtveDUzbUZEVTJONmU0RlBaWmsvQmhqamgwdTljZjVFL3JQaU1EQnJpajJFR1h3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==";
const ALLOWED_STATUSES = new Set([
  "created",
  "processing",
  "hold",
  "success",
  "failure",
  "reversed",
  "expired",
]);

const hasValidSignature = (rawBody, signature) => {
  if (!Buffer.isBuffer(rawBody) || !signature) return false;

  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(rawBody);
    verify.end();
    return verify.verify(
      Buffer.from(MONOBANK_PUBLIC_KEY, "base64"),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
};

const sendPaymentNotifications = async (order) => {
  const paidAt = new Date();
  const amount = formatMoney(order.totalPrice);
  const customerName = `${order.firstName || ""} ${order.lastName || ""}`.trim();
  const paymentDetails = emailDetails([
    ["Замовлення", order.orderId],
    ["Сума оплати", `${amount} грн`],
    ["Статус", "Оплачено"],
  ]);

  const notifications = [];
  if (!order.customerPaymentNotifiedAt) {
    notifications.push({
      field: "customerPaymentNotifiedAt",
      message: {
        from: mailFrom,
        to: order.email,
        subject: `Оплату замовлення ${order.orderId} підтверджено`,
        html: emailLayout({
          eyebrow: "ОПЛАТУ ПІДТВЕРДЖЕНО",
          title: `Дякуємо, ${order.firstName || ""}!`,
          intro: "Ми отримали оплату та починаємо обробляти ваше замовлення.",
          content: paymentDetails,
        }),
      },
    });
  }
  if (!order.adminPaymentNotifiedAt) {
    notifications.push({
      field: "adminPaymentNotifiedAt",
      message: {
        from: mailFrom,
        to: adminOrderEmails,
        subject: `Замовлення ${order.orderId} оплачено`,
        html: emailLayout({
          eyebrow: "ОПЛАТА ОТРИМАНА",
          title: `Замовлення ${order.orderId} оплачено`,
          intro: "Monobank підтвердив успішну оплату.",
          content: `${emailDetails([
            ["Покупець", customerName || "Не вказано"],
            ["Email", order.email],
            ["Телефон", order.phone],
          ])}${paymentDetails}`,
        }),
      },
    });
  }

  if (notifications.length === 0) return;

  const results = await Promise.allSettled(
    notifications.map(({ message }) => transport.sendMail(message))
  );
  results.forEach((result, index) => {
    const { field } = notifications[index];
    if (result.status === "fulfilled") {
      order[field] = paidAt;
    } else {
      console.error(
        `Order ${order.orderId}: ${field} email failed`,
        result.reason?.message || "Unknown mail error"
      );
    }
  });
  await order.save();
};

const monobankWebhook = async (req, res) => {
  const signature = req.headers["x-sign"];
  if (!hasValidSignature(req.rawBody, signature)) {
    return res.status(400).json({ message: "Invalid Monobank signature" });
  }

  const { invoiceId, status, reference, amount } = req.body || {};
  if (!invoiceId || !ALLOWED_STATUSES.has(status)) {
    return res.status(400).json({ message: "Invalid Monobank payload" });
  }

  const order = await Order.findOne({ paymentId: invoiceId });
  if (!order) {
    console.warn(`Monobank webhook: invoice ${invoiceId} was not found`);
    return res.status(200).send();
  }

  const expectedAmount = Math.round(Number(order.totalPrice) * 100);
  if (
    (reference && reference !== order.orderId) ||
    (Number.isFinite(Number(amount)) && Number(amount) !== expectedAmount)
  ) {
    console.error(`Monobank webhook: invoice ${invoiceId} does not match order`);
    return res.status(200).send();
  }

  if (order.paymentStatus !== status) {
    order.paymentStatus = status;
    await order.save();
  }

  if (status === "success") {
    await sendPaymentNotifications(order);
  }

  return res.status(200).send();
};

module.exports = monobankWebhook;
