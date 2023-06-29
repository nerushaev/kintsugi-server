const Order = require('../../models/order');

const getAllOrders = async (req, res) => {
  const order = await Order.find()
  res.json({order});
}

module.exports = getAllOrders;