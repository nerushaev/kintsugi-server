const Order = require('../../models/order');

const getOrder = async (req, res) => {

  console.log(req.body);

  if(req.body.length === 1) {
    console.log('here1');
    const order = await Order.find({ orderId: req.body[0] });
    res.json({order});
  } else {
    console.log('here2');
      const data = await Order.find({orderId: req.body});
      console.log(data);
      res.json({order: data});
  }
  
  // res.json({order});
}

module.exports = getOrder;