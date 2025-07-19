const Order = require("../../models/order");
const { User } = require("../../models/user");
const RandExp = require("randexp");
const { KINTSUGI_GMAIL } = process.env;
const { transport } = require("../../middleware");
const { monoPay } = require("../../helpers");

const addOrder = async (req, res) => {
  console.log("+++ addOrder handler called");

  try {
    console.log("1. Распаковали req.body:", req.body);

    const {
      email,
      products,
      bundles,
      notCall,
      firstName,
      lastName,
      phone,
      payments,
      address,
      deliveryType, // деструктурили deliveryType
      deliveryMethod, // добавил для ясности
    } = req.body;

    console.log("2. До User.findOne");
    const user = await User.findOne({ email });
    console.log("3. После User.findOne, user:", user);

    const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
    console.log("4. Сгенерирован orderId:", orderId);

    if (user) {
      console.log("5. Апдейтим пользователя:", user._id);
      await User.findByIdAndUpdate(user._id, { $push: { orders: orderId } });
      console.log("6. Пользователь обновлён");
    } else {
      console.log("5. Пользователь не найден, пропускаем апдейт");
    }

    console.log("7. Начинаем подсчёт totalPrice");
    let totalPrice = 0;
    products.forEach((item) => {
      totalPrice += (item.price / 100) * item.amount;
    });
    bundles.forEach((item) => {
      totalPrice += (item.newPrice / 100) * item.amount;
    });

    // 6. Формат даты
    const D = new Date();
    const DateFormat =
      ("0" + D.getDate()).slice(-2) +
      "." +
      ("0" + (D.getMonth() + 1)).slice(-2) +
      "." +
      D.getFullYear();
    console.log("9. Сформатирована дата:", DateFormat);

    // 7. Создание заказа в базе
    console.log("10. До Order.create");
    await Order.create({
      orderId,
      date: DateFormat,
      totalPrice,
      ...req.body,
    });

    const deliveryHtml = (() => {
      if (deliveryMethod === "nova") {
        if (address.deliveryType === "branch" && address.warehouse) {
          return `
          <p>Місто: ${address.city}</p>
          <p>Доставка на відділення Нової пошти: ${address.warehouse}</p>
                  `;
        }
        if (address.deliveryType === "postbox" && address.postbox) {
          return `
          <p>Місто: ${address.city}</p>
          <p>Доставка на поштову скриньку: ${address.postbox}</p>
                  `;
        }
        if (address.deliveryType === "address" && address.address) {
          return `
          <p>Місто: ${address.city}</p>
          <p>Доставка за адресою: ${address.address}, буд. ${address.house}, кв. ${address.apartment}</p>
                  `;
        }
      }
      return `<p>Тип доставки: Самовивіз</p>`;
    })();

    const productsHtml = products
      .map(
        (item) => `
      <div style="margin-bottom:15px;">
        <img src="https://kintsugi.joinposter.com${
          item.photo_origin || ""
        }" alt="${item.product_name}" style="max-width:100px;"/><br/>
        <strong>${item.product_name}</strong><br/>
        ${item.size ? `<em>Розмір: ${item.size}</em><br/>` : ""}
        Ціна: ${(item.price / 100).toFixed(2)} грн<br/>
        Кількість: ${item.amount}
      </div>`
      )
      .join("");

    const bundlesHtmls = bundles?.map(
      (item) =>
        `
      <div style="margin-bottom:15px;">
        
        <h3>${item.title}</h3><br/>
        ${item.products
          .map(
            (item) => `
      <div style="margin-bottom:15px;">
        <img src="https://kintsugi.joinposter.com${
          item.photo_origin || ""
        }" alt="${item.product_name}" style="max-width:100px;"/><br/>
        <strong>${item.product_name}</strong><br/>
        ${item.size ? `<em>Розмір: ${item.size}</em><br/>` : ""}
        Ціна: ${(item.price / 100).toFixed(2)} грн<br/>
      </div>`
          )
          .join("")}
        Ціна: ${(item.newPrice / 100).toFixed(2)} грн<br/>
      </div>`
    );

    const userOrderMessage = {
      from: KINTSUGI_GMAIL,
      to: email,
      subject: `Ваше замовлення ${orderId} підтверджено!`,
      html: `
        <h2>Дякуємо за замовлення!</h2>
        <h3>Деталі замовлення:</h3>
        ${productsHtml}
        ${bundlesHtmls}
        <h3>Загальна сума: ${totalPrice.toFixed(2)}грн</h3>
        <h3>Доставка:</h3>
        ${deliveryHtml}
        <p>${notCall ? "Ви попросили не телефонувати." : ""}</p>
        <p>Оплата: ${
          payments === "card" ? "Онлайн оплата" : "Накладений платіж"
        }</p>
      `,
    };

    const adminOrderMessage = {
      from: KINTSUGI_GMAIL,
      to: "kolyanerushaev@gmail.com",
      subject: `Нове замовлення ${orderId}`,
      html: `
        <h2>Нове замовлення ${orderId}</h2>
        <h3>Інформація про покупця</h3>
        <p>Ім'я: ${firstName} ${lastName}</p>
        <p>Пошта: ${email}</p>
        <p>Телефон: ${phone}</p>
        <h3>Доставка:</h3>
        ${deliveryHtml}
        <h3>Оплата:</h3>
        <p>${payments === "card" ? "Онлайн оплата" : "Накладений платіж"}</p>
        <p>${notCall ? "Не телефонувати покупцю" : ""}</p>
        <h3>Деталі замовлення:</h3>
        ${productsHtml}
        ${bundlesHtmls}
        <h3>Загальна сума: ${totalPrice.toFixed(2)} грн</h3>
      `,
    };

    await transport.sendMail(userOrderMessage);

    await transport.sendMail(adminOrderMessage);

    if (payments === "card") {
      console.log("22. Начинаем monoPay");
      const result = await monoPay({ amount: totalPrice * 100 });
      console.log("23. monoPay вернул:", result);

      await Order.findOneAndUpdate(
        { orderId },
        {
          $set: {
            paymentId: result.invoiceId,
            paymentStatus: "unpaid",
          },
        }
      );

      res.status(201).json({
        message: "Замовлення прийнято!",
        orderId,
        payments: {
          invoiceId: result.invoiceId,
          pageUrl: result.pageUrl,
        },
        status: "new",
      });
      return;
    }

    res.status(201).json({
      message: "Замовлення створено!",
      orderId,
      status: "Нове замовлення",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = addOrder;
