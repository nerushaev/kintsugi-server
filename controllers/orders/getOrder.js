const Order = require('../../models/order');

const getOrder = async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.find({ orderId });
  
  res.json({order});
}

module.exports = getOrder;