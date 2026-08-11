const Order = require("../../models/order");

const getOrdersByIds = async (req, res) => {
  const { orderIds } = req.body;
  if (!Array.isArray(orderIds)) {
    return res.status(400).json({ message: "orderIds must be an array" });
  }

  try {
    const ownedOrderIds = new Set((req.user.orders || []).map(String));
    const allowedOrderIds =
      req.user.role === "admin"
        ? orderIds
        : orderIds.filter((orderId) => ownedOrderIds.has(String(orderId)));

    const orders = await Order.find({ orderId: { $in: allowedOrderIds } }).sort({
      createdAt: -1,
    });

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

module.exports = getOrdersByIds;
