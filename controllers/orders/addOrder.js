const Order = require("../../models/order");
const { User } = require("../../models/user");
const moment = require("moment");
const RandExp = require('randexp');
const {KINTSUGI_GMAIL, PRIVATE_LIQPAY_KEY} = process.env;
const {transport} = require('../../middleware');
const crypto = require('crypto');

const addOrder = async (req, res) => {
  const {
    email,
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
    payments,
    phone,
    name,
  } = req.body;

  const liqpay = payments === 'liqpay' ? true : false;

  const user = await User.findOne({ email });
  // Создаём из массива обьектов массив айди
  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  const { products } = req.body;
  // let arrayId = [];
    let totalPrice = 0;

  products.map((item) => {
    return totalPrice += ((item.price / 100) * item.amount);
  });
  // const items = await Product.find({ product_id: { $in: arrayId } });



  // console.log(items);
  // const result = items.filter((item) => {
  //   const product_id = item.product_id.toString();
  //   const result = products.find((elem) => {
  //     if (elem.product_id === product_id) {
  //       const isNotHaveAmount = item.amount < elem.amount;
  //       return isNotHaveAmount;
  //     }
  //   });
  //   return result;
  // });

  // let errors = {};

  // if (result) {
  //   errors = result.map((item) => {
  //     return {
  //       [item.product_id]: `Нажаль ${item.name} залишилось ${item.amount}`,
  //     };
  //   });
  // }

  // if (errors?.length) {
  //   res.status(400).json({
  //     errors,
  //   });
  // }


  let D = new Date();
  const DateFormat = ('0' + D.getDate()).slice(-2) + '.' + ('0' + (D.getMonth() + 1)).slice(-2) + '.' + D.getFullYear();
  

  const deliveryData = {
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
  };


  let liqpayPayments = {};

  if(liqpay) {
    await Order.create({
      ...req.body,
      orderId,
      totalPrice,
      date,
      email: user.email,
      payment: "unpaid"
    });

    const dataObj = {
      version: 3,
      public_key: "sandbox_i41941011705",
      private_key: PRIVATE_LIQPAY_KEY,
      action: "pay",
      amount: totalPrice,
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

    liqpayPayments.signature = signature;
    liqpayPayments.data = data;
    liqpayPayments.orderId = orderId;

  } else {
    await Order.create({
      ...req.body,
      orderId,
      totalPrice,
      date: DateFormat,
      email: user.email,
      phone: user.phone,
      payment: "Наложка"
    });
  }

  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        orders: orderId
      },
    });
  }

  if (user) {
    await User.findOneAndUpdate(user._id, {
      $set: { delivery: deliveryData },
    });
  }

  const userOrderMessage = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Ви зробили замовлення в косплей магазині Kintsugi!",
    html: `<h2>Ваше замовлення ${orderId}</h2>
            <h3>Деталі замовлення:</h3>
            ${products.map(item => {
              return `<img src=${`https://kintsugi.joinposter.com${item.photo}`} referrerpolicy="no-referrer"  />
                      <p>${item.name}</p>
                      <p>${item.size}</p>
                      <p>Ціна: ${item.price / 100}грн</p>
                      
              `
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
    `,
  }

  const adminOrderMessage = {
    from: KINTSUGI_GMAIL,
    to: 'kolyanerushaev@gmail.com',
    subject: "Нове замовлення!",
    html: `<h2>Номер замовлення ${orderId}</h2>
            <h3>Інформація про покупця</h3>
            <p>Ім'я: ${name}</p>
            <p>Пошта: ${email}</p>
            <p>Телефон: ${phone}</p>
            <p>Місто: ${city}</p>
            <p>Відділення: ${warehouse}</p>
            <h3>Деталі замовлення:</h3>
            ${products.map(item => {
              return `<img src=${`https://kintsugi.joinposter.com${item.photo}`} referrerpolicy="no-referrer"  />
                      <p>${item.name}</p>
                      <p>Ціна: ${item.price / 100}грн</p>
              `
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
    `,
  }

  await transport.sendMail(adminOrderMessage);
  await transport.sendMail(userOrderMessage);

  res.status(201).json({
    message: "Замовлення прийнято!",
    orderId,
    liqpay: liqpayPayments
  });
};

module.exports = addOrder;
