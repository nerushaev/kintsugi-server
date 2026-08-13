const Order = require("../../models/order");

const ORDER_STATUSES = new Set([
  "new",
  "processing",
  "sent",
  "shipped",
  "completed",
  "canceled",
]);
const ALLOWED_FIELDS = new Set(["status", "TTN"]);

const updateOrderField = async (req, res) => {
  const { key, value } = req.body || {};
  const { orderId } = req.params;

  if (!orderId || !ALLOWED_FIELDS.has(key)) {
    return res.status(400).json({ message: "Дозволено змінювати лише статус або ТТН" });
  }

  const normalizedValue = String(value || "").trim();
  if (key === "status" && !ORDER_STATUSES.has(normalizedValue)) {
    return res.status(400).json({ message: "Некоректний статус замовлення" });
  }
  if (key === "TTN" && !/^\d{14}$/.test(normalizedValue)) {
    return res.status(400).json({ message: "ТТН Нової пошти має містити 14 цифр" });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { orderId },
    { $set: { [key]: normalizedValue } },
    { new: true, runValidators: true }
  );

  if (!updatedOrder) {
    return res.status(404).json({ message: "Замовлення не знайдено" });
  }

  return res.json({
    message: key === "TTN" ? "ТТН оновлено" : "Статус замовлення оновлено",
    order: updatedOrder,
  });
};

module.exports = updateOrderField;
