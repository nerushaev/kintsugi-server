const Order = require("../../models/order");

const getOrder = async (req, res) => {
  const requestedIds = Array.isArray(req.body)
    ? req.body
    : Array.isArray(req.body?.orderIds)
      ? req.body.orderIds
      : [];

  const ownedOrderIds = new Set((req.user.orders || []).map(String));
  const allowedIds =
    req.user.role === "admin"
      ? requestedIds
      : requestedIds.filter((orderId) => ownedOrderIds.has(String(orderId)));

  const orders = await Order.find({ orderId: { $in: allowedIds } }).sort({
    createdAt: -1,
  });

  return res.json({ order: orders });
};

module.exports = getOrder;
