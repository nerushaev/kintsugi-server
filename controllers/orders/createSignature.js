const {PRIVATE_LIQPAY_KEY} = process.env;
const crypto = require('crypto');

const createSignature = (req, res) => {
  const {products, orderId} = req.body;


    // const items = products.map((item) => {

    //   return {

    //   }
    // });

  // const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();

    const dataObj = {
      version: 3,
      public_key: "sandbox_i41941011705",
      private_key: PRIVATE_LIQPAY_KEY,
      action: "pay",
      amount: products[0].price,
      currency: "UAH",
      description: "Придбання товару",
      order_id: orderId,
      result_url: "https://kintsugi.org.ua/user",
      server_url: "https://api.kintsugi.org.ua/api/orders/liqpay",
    }

    const jsonStr = JSON.stringify(dataObj); 
    const buff = new Buffer.from(jsonStr, 'utf-8');
    const data = buff.toString('base64');
    
    const sign_string = PRIVATE_LIQPAY_KEY + data + PRIVATE_LIQPAY_KEY;
    const sha1Hash = crypto.createHash('sha1').update(sign_string, 'utf-8').digest();
    const signature = sha1Hash.toString('base64');

    return {
      data: data,
      signature: signature,
      orderId: orderId
    }
}

module.exports = createSignature;