const Product = require("../../models/product");
const Order = require("../../models/order");
const { User } = require("../../models/user");
const moment = require("moment");
const RandExp = require('randexp');
const KINTSUGI_GMAIL = process.env;
const {transport} = require('../../middleware');

const addOrder = async (req, res) => {
  const {
    email,
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
    liqpay,
    phone,
    name,
  } = req.body;

  const user = await User.findOne({ email });
  // Создаём из массива обьектов массив айди
  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  const { products } = req.body;
  let arrayId = [];
  let totalPrice = 0;

  products.map((item) => {
    arrayId.push(item._id);
    totalPrice = totalPrice + Math.floor(item.price);
  });

  const items = await Product.find({ _id: { $in: arrayId } });

  const result = items.filter((item) => {
    const _id = item._id.toString();
    const result = products.find((elem) => {
      if (elem._id === _id) {
        const isNotHaveAmount = item.amount < elem.amount;
        return isNotHaveAmount;
      }
    });
    return result;
  });

  let errors = {};

  if (result) {
    errors = result.map((item) => {
      return {
        [item._id]: `Нажаль ${item.name} залишилось ${item.amount}`,
      };
    });
  }

  if (errors?.length) {
    res.status(400).json({
      errors,
    });
  }

  const dateDMY = moment().format("l");
  const dateHM = moment().format("LT");
  const date = dateDMY + `${"|"}` + dateHM;

  const deliveryData = {
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
  };

  console.log(deliveryData);

  if(liqpay) {
    await Order.create({
      ...req.body,
      orderId,
      totalPrice,
      date,
      email: user.email,
      payment: "unpaid"
    });
  } else {
    await Order.create({
      ...req.body,
      orderId,
      totalPrice,
      date,
      email: user.email,
      payment: "Наложка"
    });
  }

  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        orders: {
          products: [...products],
          date,
          totalPrice,
        },
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
              return `<img src=${item.image[0]} referrerpolicy="no-referrer"  />
                      <p>${item.name}</p>
                      <p>Ціна: ${item.price}грн</p>
              `
            })}
            <h3>Загальна сума: ${totalPrice}грн</h3>
    `,
  }

  const adminOrderMessage = {
    from: KINTSUGI_GMAIL,
    to: email,
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
              return `<img src=${item.image[0]} referrerpolicy="no-referrer"  />
                      <p>${item.name}</p>
                      <p>Ціна: ${item.price}грн</p>
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
    liqpay: liqpay
  });
};

module.exports = addOrder;
