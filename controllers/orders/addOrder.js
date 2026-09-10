const { buildProducts, buildBundles, validateCombinedAvailability } = require("../../services/orderCart");
const { priceOrder } = require("../../services/promoPricing");
const Order = require("../../models/order");
const { sanitizeAnalytics } = require("../../services/purchaseAnalytics");
const { User } = require("../../models/user");
const RandExp = require("randexp");
const { transport } = require("../../middleware");
const { monoPay } = require("../../helpers");
const {
  adminOrderEmails,
  emailDetails,
  emailItems,
  emailLayout,
  formatMoney,
  mailFrom,
} = require("../../helpers/emailTemplates");
const {
  PERSON_NAME_PATTERN,
  normalizePersonName,
  normalizeEmail,
  normalizeUkrainianPhone,
  isUkrainianPhone,
} = require("../../helpers/customerValidation");

const PAYMENT_METHODS = new Set(["cash", "card"]);
const DELIVERY_METHODS = new Set(["nova", "self"]);
const NOVA_DELIVERY_TYPES = new Set(["branch", "postbox", "address"]);

const cleanText = (value, maxLength = 300) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const validateContact = ({ firstName, lastName, email, phone }) => {
  if (!firstName || !lastName || !email || !phone) {
    return "Заповніть ім’я, прізвище, пошту та номер телефону";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Вкажіть коректну адресу електронної пошти";
  }
  if (!PERSON_NAME_PATTERN.test(firstName) || !PERSON_NAME_PATTERN.test(lastName)) {
    return "Ім’я та прізвище можуть містити літери, пробіл, дефіс або апостроф";
  }
  if (!isUkrainianPhone(phone)) {
    return "Вкажіть коректний номер телефону";
  }
  return "";
};

const normalizeAddress = (deliveryMethod, source = {}) => {
  if (deliveryMethod === "self") {
    return {
      deliveryType: "self",
      city: "",
      warehouse: "",
      postbox: "",
      address: "",
      house: "",
      apartment: "",
    };
  }

  const deliveryType = cleanText(source.deliveryType, 20);
  const city = cleanText(source.city, 100);
  if (!NOVA_DELIVERY_TYPES.has(deliveryType) || !city) {
    throw new Error("INCOMPLETE_DELIVERY_ADDRESS");
  }

  const address = {
    deliveryType,
    city,
    warehouse: cleanText(source.warehouse, 100),
    postbox: cleanText(source.postbox, 100),
    address: cleanText(source.address, 150),
    house: cleanText(source.house, 30),
    apartment: cleanText(source.apartment, 30),
    cityRef: cleanText(source.cityRef, 80),
    settlementRef: cleanText(source.settlementRef, 80),
    warehouseRef: cleanText(source.warehouseRef, 80),
    warehouseIndex: cleanText(source.warehouseIndex, 30),
    streetRef: cleanText(source.streetRef, 80),
  };

  if (deliveryType === "branch" && !address.warehouse) {
    throw new Error("INCOMPLETE_DELIVERY_ADDRESS");
  }
  if (deliveryType === "postbox" && !address.postbox) {
    throw new Error("INCOMPLETE_DELIVERY_ADDRESS");
  }
  if (
    deliveryType === "address" &&
    (!address.address || !address.house)
  ) {
    throw new Error("INCOMPLETE_DELIVERY_ADDRESS");
  }

  return address;
};

const publicOrderResponse = (order) => ({
  message: "Замовлення прийнято!",
  orderId: order.orderId,
  payments: order.paymentUrl
    ? { invoiceId: order.paymentId, pageUrl: order.paymentUrl }
    : undefined,
  status: order.status,
  totalPrice: order.totalPrice,
  discountAmount: order.discountAmount,
  promoCode: order.promoCode,
});

const linkOrderToUser = async (email, orderId) => {
  if (!email || !orderId) return;

  await User.updateOne(
    { email: normalizeEmail(email) },
    { $addToSet: { orders: orderId } }
  );
};

const addOrder = async (req, res) => {
  const clientRequestId = cleanText(req.body.clientRequestId, 100);
  if (!clientRequestId) {
    return res.status(400).json({ message: "Не вдалося ідентифікувати замовлення" });
  }

  const existingOrder = await Order.findOne({ clientRequestId });
  if (existingOrder) {
    await linkOrderToUser(existingOrder.email, existingOrder.orderId);

    if (existingOrder.payments === "card" && !existingOrder.paymentUrl) {
      if (existingOrder.paymentStatus === "creating") {
        return res.status(409).json({ message: "Сторінка оплати вже створюється. Зачекайте кілька секунд." });
      }
      try {
        existingOrder.paymentStatus = "creating";
        await existingOrder.save();
        const invoice = await monoPay({
          amount: Math.round(existingOrder.totalPrice * 100),
          orderId: existingOrder.orderId,
        });
        existingOrder.paymentId = invoice.invoiceId;
        existingOrder.paymentUrl = invoice.pageUrl;
        existingOrder.paymentStatus = "unpaid";
        await existingOrder.save();
      } catch {
        existingOrder.paymentStatus = "invoice_failed";
        await existingOrder.save();
        return res.status(502).json({ message: "Не вдалося створити сторінку оплати. Спробуйте ще раз." });
      }
    }
    return res.status(200).json(publicOrderResponse(existingOrder));
  }

  const firstName = normalizePersonName(cleanText(req.body.firstName, 80));
  const lastName = normalizePersonName(cleanText(req.body.lastName, 80));
  const email = normalizeEmail(cleanText(req.body.email, 150));
  const phone = normalizeUkrainianPhone(cleanText(req.body.phone, 30));
  const payments = cleanText(req.body.payments, 20);
  const deliveryMethod = cleanText(req.body.deliveryMethod, 20);
  const deliveryComments = cleanText(req.body.deliveryComments, 1000);
  const notCall = Boolean(req.body.notCall);

  const contactError = validateContact({ firstName, lastName, email, phone });
  if (contactError) return res.status(400).json({ message: contactError });
  if (!PAYMENT_METHODS.has(payments) || !DELIVERY_METHODS.has(deliveryMethod)) {
    return res.status(400).json({ message: "Оберіть доставку та спосіб оплати" });
  }

  let address;
  let products;
  let bundles;
  try {
    address = normalizeAddress(deliveryMethod, req.body.address);
    [products, bundles] = await Promise.all([
      buildProducts(req.body.products),
      buildBundles(req.body.bundles),
    ]);
    await validateCombinedAvailability(products, bundles);
  } catch (error) {
    if (error.message === "INCOMPLETE_DELIVERY_ADDRESS") {
      return res.status(400).json({ message: "Заповніть адресу доставки" });
    }
    if (error.message === "PRODUCT_UNAVAILABLE") {
      return res.status(409).json({ message: "Деякі товари вже недоступні у вибраній кількості" });
    }
    return res.status(400).json({ message: "Перевірте склад кошика" });
  }

  if (products.length === 0 && bundles.length === 0) {
    return res.status(400).json({ message: "Кошик порожній" });
  }

  let pricing;
  try {
    pricing = await priceOrder(products, bundles, req.body.promoCode);
  } catch (error) {
    if (!error.status) throw error;
    return res.status(error.status).json({ message: error.message });
  }
  const { totalPrice, subtotalPrice, discountAmount, promoCode, promoPercent } = pricing;

  if (promoCode && (!Number.isFinite(req.body.expectedTotal) || Math.round(req.body.expectedTotal * 100) !== Math.round(totalPrice * 100))) {
    return res.status(409).json({ message: "Сума замовлення змінилася. Застосуйте промокод повторно." });
  }

  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

  let order;
  try {
    order = await Order.create({
      analytics: sanitizeAnalytics(req.body.analytics),
      clientRequestId,
      orderId,
      date,
      firstName,
      lastName,
      email,
      phone,
      payments,
      deliveryMethod,
      deliveryComments,
      notCall,
      address,
      products,
      bundles,
      totalPrice, subtotalPrice, discountAmount, promoCode, promoPercent,
      status: "new",
      paymentStatus: payments === "card" ? "creating" : undefined,
    });
    await linkOrderToUser(email, orderId);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await Order.findOne({ clientRequestId }).lean();
      if (duplicate?.payments !== "card" || duplicate?.paymentUrl) {
        return res.status(200).json(publicOrderResponse(duplicate));
      }
      return res.status(409).json({ message: "Замовлення вже обробляється. Зачекайте кілька секунд." });
    }
    throw error;
  }

  if (payments === "card") {
    try {
      const invoice = await monoPay({ amount: Math.round(totalPrice * 100), orderId });
      order.paymentId = invoice.invoiceId;
      order.paymentUrl = invoice.pageUrl;
      order.paymentStatus = "unpaid";
      await order.save();
    } catch (error) {
      order.paymentStatus = "invoice_failed";
      await order.save();
      return res.status(502).json({
        message: "Замовлення збережено, але сторінку оплати не вдалося створити. Зверніться до магазину.",
        orderId,
      });
    }
  }

  const orderItems = [
    ...products.map((item) => ({
      title: item.product_name,
      meta: `${item.amount} шт.${item.size ? ` · ${item.size}` : ""}`,
      price: `${formatMoney((item.price / 100) * item.amount)} грн`,
    })),
    ...bundles.map((item) => ({
      title: item.title,
      meta: `Комплект · ${item.amount} шт.`,
      price: `${formatMoney((item.newPrice / 100) * item.amount)} грн`,
    })),
  ];
  const deliveryLabel = deliveryMethod === "self"
    ? "Самовивіз із магазину"
    : `${address.city} · ${address.deliveryType === "branch" ? `Відділення ${address.warehouse}` : address.deliveryType === "postbox" ? `Поштомат ${address.postbox}` : `${address.address}, буд. ${address.house}${address.apartment ? `, кв. ${address.apartment}` : ""}`}`;
  const paymentLabel = payments === "card" ? "Онлайн-оплата" : "Оплата при отриманні";
  const orderSummary = `${emailItems(orderItems)}${emailDetails([
    ["Доставка", deliveryLabel],
    ["Оплата", paymentLabel],
    ...(discountAmount ? [["Сума товарів", `${formatMoney(subtotalPrice)} грн`], ["Промокод", promoCode], ["Знижка", `−${formatMoney(discountAmount)} грн`]] : []),
    ["Разом", `${formatMoney(totalPrice)} грн`],
  ])}`;
  const customerMailHtml = emailLayout({
    eyebrow: "ЗАМОВЛЕННЯ ПРИЙНЯТО",
    title: `Замовлення ${orderId} оформлено`,
    intro: `${firstName}, дякуємо за замовлення! Ми отримали його та незабаром почнемо обробку.`,
    content: orderSummary,
  });
  const adminMailHtml = emailLayout({
    eyebrow: "НОВЕ ЗАМОВЛЕННЯ",
    title: `Нове замовлення ${orderId}`,
    intro: "На сайті оформлено нове замовлення.",
    content: `${emailDetails([
      ["Покупець", `${firstName} ${lastName}`],
      ["Email", email],
      ["Телефон", phone],
      ["Не телефонувати", notCall ? "Так" : "Ні"],
      ["Коментар", deliveryComments],
    ])}${orderSummary}`,
  });
  const notificationResults = await Promise.allSettled([
    transport.sendMail({ from: mailFrom, to: email, subject: `Замовлення ${orderId} прийнято`, html: customerMailHtml }),
    transport.sendMail({ from: mailFrom, to: adminOrderEmails, subject: `Нове замовлення ${orderId}`, html: adminMailHtml }),
  ]);
  if (notificationResults.some(({ status }) => status === "rejected")) {
    console.error(`Order ${orderId}: one or more notification emails failed`);
  }

  return res.status(201).json(publicOrderResponse(order));
};

module.exports = addOrder;
