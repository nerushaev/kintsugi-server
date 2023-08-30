const Order = require('../../models/order');

const getAllOrders = async (req, res) => {
  const orders = await Order.find();
  console.log(orders);
  res.json({orders});
}

module.exports = getAllOrders;