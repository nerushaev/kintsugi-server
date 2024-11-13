const Order = require("../../models/order");
const { User } = require("../../models/user");
// const moment = require("moment");
const RandExp = require("randexp");
const { KINTSUGI_GMAIL, PRIVATE_LIQPAY_KEY } = process.env;
const { transport } = require("../../middleware");
// const crypto = require("crypto");
const { monoPay } = require("../../helpers");

const addOrder = async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    addressDelivery,
    products,
    city,
    delivery,
    notCall,
    orderComments,
    deliveryComments,
    payments,
    warehouse,
    postbox,
    postboxDelivery,
    warehouseDelivery,
  } = req.body;

  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  const deliveryMessage = delivery === "nova" ? "Нова Пошта" : "Самовивіз";
  const deliveryDetails = 
    (warehouseDelivery && "До відділення") ||
    (postboxDelivery && "До поштомату") ||
    (addressDelivery && "Курьерською доставкою");

  //Незарегестрированый юзер

  const user = await User.findOne({ email });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        orders: orderId,
      },
    });
  }

  let totalPrice = 0;
  products.map((item) => {
    return (totalPrice += (item.price / 100) * item.amount);
  });

  let D = new Date();
  const DateFormat =
    ("0" + D.getDate()).slice(-2) +
    "." +
    ("0" + (D.getMonth() + 1)).slice(-2) +
    "." +
    D.getFullYear();


  await Order.create({
      orderId: orderId,
      date: DateFormat,
      delivery: deliveryMessage,
      deliveryDetails: deliveryMessage,
      totalPrice: totalPrice,
      ...req.body
    })


  const userOrderMessage = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Ви зробили замовлення в косплей магазині Kintsugi!",
    html: `<h2>Ваше замовлення ${orderId}</h2>
            <h3>Деталі замовлення:</h3>
            ${products.map((item) => {
              return `<img src=${`https://kintsugi.joinposter.com${item.photo_origin}`} referrerpolicy="no-referrer"  />
                      <p>${item.product_name}</p>
                      <p>Ціна: ${item.price / 100}грн</p>

              `;
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
            <h3>Доставка: ${deliveryMessage}</h3>
            ${delivery === "nova" ? `
            <p>Замовлення ${deliveryDetails}</p>
            <p>Місто: ${city}</p>
            ${warehouseDelivery ? `<p>${warehouse}</p>` : ""}
            ${postboxDelivery ? `<p>${postbox}</p>` : ""}
            ${addressDelivery ? `<p>Адреса: ${address.address} буд.${address.house} кв.${address.appartment}</p>` : ""}
            ` : ''}
            
    `,
  };

  const adminOrderMessage = {
    from: KINTSUGI_GMAIL,
    to: "kolyanerushaev@gmail.com",
    subject: "Нове замовлення!",
    html: `<h2>Номер замовлення ${orderId}</h2>
            <h3>Інформація про покупця</h3>
            <p>Ім'я: ${name}</p>
            <p>Пошта: ${email}</p>
            <p>Телефон: ${phone}</p>
            <h3>Доставка: ${deliveryMessage}</h3>
            <h3>Оплата: ${payments === "card" ? "Онлайн оплата" : "Накладений платіж"}</h3>
            ${notCall ? "Не телефонувати" : ""}
            ${delivery === "nova" ? `
            <p>Замовлення ${deliveryDetails}</p>
            <p>Місто: ${city}</p>
            ${warehouseDelivery ? `<p>${warehouse}</p>` : ""}
            ${postboxDelivery ? `<p>${postbox}</p>` : ""}
            ${addressDelivery ? `<p>Адреса: ${address.address} буд.${address.house} кв.${address.appartment}</p>` : ""}
            ` : ''}
            <h3>Деталі замовлення:</h3>
            ${products.map((item) => {
              return `<img src=${`https://kintsugi.joinposter.com${item.photo_origin}`} referrerpolicy="no-referrer"  />
                      <p>${item.product_name}</p>
                      ${item.size ? `<p>${item.size}</p>` : ""}
                      <p>Ціна: ${item.price / 100}грн</p>
                      <p>Кількість: ${item.amount}</p>
              `;
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
    `,
  };

  await transport.sendMail(adminOrderMessage);
  await transport.sendMail(userOrderMessage);

  if (payments === "card") {
    const result = await monoPay({amount: totalPrice * 100});
    console.log(result);
    const { invoiceId, pageUrl } = result;
    await Order.findOneAndUpdate({orderId}, {$set: {
      paymentId: invoiceId,
      paymentStatus: "unpaid"
    }});
    res.status(201).json({
      message: "Замовлення прийнято!",
      orderId,
      payments: {
        invoiceId: invoiceId,
        pageUrl: pageUrl,
      }
    });
    return;
  }

  res.status(201).json({
    message: "Замовлення створено!",
    orderId,
  });
};

module.exports = addOrder;
