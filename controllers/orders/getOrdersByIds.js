const Order = require("../../models/order");

const getOrdersByIds = async (req, res) => {
  const { orderIds } = req.body;
  console.log(req.body)
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: "orderIds must be a non-empty array" });
  }

  try {
    const orders = await Order.find({ orderId: { $in: orderIds } });

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

module.exports = getOrdersByIds;
