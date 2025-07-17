const Order = require("../../models/order");
const { User } = require("../../models/user");

const deleteOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: "orderId обов'язковий" });
    }

    const deletedOrder = await Order.findOneAndDelete({ orderId });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    // Удаляем orderId из массива заказов пользователя
    await User.updateOne(
      { orders: orderId },          // Найти пользователя с этим заказом
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
