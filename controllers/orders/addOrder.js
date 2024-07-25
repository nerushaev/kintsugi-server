const Order = require("../../models/order");
const { User } = require("../../models/user");
const moment = require("moment");
const RandExp = require("randexp");
const { KINTSUGI_GMAIL, PRIVATE_LIQPAY_KEY } = process.env;
const { transport } = require("../../middleware");
const crypto = require("crypto");
const { monoPay } = require("../../helpers");

const addOrder = async (req, res) => {
  const {
    email,
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
    phone,
    name,
    delivery,
    payments
  } = req.body;

  const user = await User.findOne({ email });
  // Создаём из массива обьектов массив айди
  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  const { products } = req.body;
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

  const deliveryData = {
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
  };

  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        orders: orderId,
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
            ${products.map((item) => {
              return `<img src=${`https://kintsugi.joinposter.com${item.photo}`} referrerpolicy="no-referrer"  />
                      <p>${item.product_name}</p>
                      <p>Ціна: ${item.price / 100}грн</p>
                      
              `;
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
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
            <p>Доставка: ${
              delivery === "nova" ? "Новою поштою" : "Самовивіз"
            }</p>
            ${city ? `<p>Місто: ${city}</p>` : ""}
            ${warehouse ? `<p>Відділення: ${warehouse}</p>` : ""}
            <h3>Деталі замовлення:</h3>
            ${products.map((item) => {
              return `<img src=${`https://kintsugi.joinposter.com${item.photo}`} referrerpolicy="no-referrer"  />
                      <p>${item.product_name}</p>
                      ${item.size ? `<p>${item.size}</p>` : ""}
                      <p>Ціна: ${item.price / 100}грн</p>
                      <p>Кількість: ${item.amount}</p>
              `;
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
    `,
  };

  await Order.create({
    ...req.body,
    orderId,
    totalPrice,
    date: DateFormat,
    email: email,
    phone: phone,
    status: "Прийнято",
  });

  // await transport.sendMail(adminOrderMessage);
  // await transport.sendMail(userOrderMessage);

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
    message: "Замовлення прийнято!",
    orderId,
  });
};

module.exports = addOrder;
