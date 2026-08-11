const Order = require("../../models/order");
const { User } = require("../../models/user");

const deleteOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: "orderId обов'язковий" });
    }

    const ownsOrder = (req.user.orders || []).some(
      (userOrderId) => String(userOrderId) === String(orderId)
    );
    if (req.user.role !== "admin" && !ownsOrder) {
      return res.status(403).json({ message: "Недостатньо прав для видалення замовлення" });
    }

    const deletedOrder = await Order.findOneAndDelete({ orderId });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    // Удаляем orderId из массива заказов пользователя
    const ownerFilter =
      req.user.role === "admin" ? { orders: orderId } : { _id: req.user._id };
    await User.updateOne(
      ownerFilter,
      { $pull: { orders: orderId } } // Удалить заказ из массива
    );

    res.json({
      message: "Замовлення успішно видалено",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("Помилка при видаленні замовлення:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

module.exports = deleteOrderByOrderId;
