const Order = require("../../models/order");

const updateOrderField = async (req, res) => {
  try {
    const { key, value } = req.body;
    const { orderId } = req.params;
    console.log(orderId)
    if (!orderId || !key) {
      return res.status(400).json({ message: "Поле id и key обязательны" });
    }

    // Собираем динамический update-объект
    const update = {
      [key]: value,
    };

    const updatedOrder = await Order.findOneAndUpdate({orderId: orderId}, update, {
      new: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Заказ не найден" });
    }

    res.json({
      message: "Поле успешно обновлено",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Ошибка при обновлении поля заказа:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

module.exports = updateOrderField;
