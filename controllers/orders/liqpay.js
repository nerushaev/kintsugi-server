const {PRIVATE_LIQPAY_KEY, KINTSUGI_GMAIL} = process.env;
const crypto = require('crypto');
const Order = require('../../models/order');
const {transport} = require('../../middleware');

const liqpay = async(req,res) => {
  const {data, signature} = req.body;
//   console.log("data", data);
//   console.log("signature", signature);

  const sign_string = PRIVATE_LIQPAY_KEY + data + PRIVATE_LIQPAY_KEY;
  const sha1Hash = crypto.createHash('sha1').update(sign_string, 'utf-8').digest();
  const mySignature = sha1Hash.toString('base64');
  
  const encodeData = Buffer.from(data, 'base64').toString('utf-8');
  const encodeDataObj = JSON.parse(encodeData);
  const {order_id, status} = encodeDataObj;

  await Order.updateOne({orderId: order_id}, {$set: {payment: status}});
  const orderInfo = Order.findOne({orderId: order_id});
  const {email} = orderInfo;

  const userLiqpayEmail = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Успішна оплата!",
    html: `<h2>Ви успішно оплатили замовлення ${order_id}!</h2>
          <p>Замовлення буду відправлено в найближчі дні!</p>
    `,
  }

  if(signature === mySignature) {
    await transport.sendMail(userLiqpayEmail);
    res.status(200).send('Success');
  } else {
    res.status(400).send('Something wrong')
  }
  
}

module.exports = liqpay;