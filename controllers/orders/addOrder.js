const Order = require("../../models/order");
const Product = require("../../models/product");
const Bundle = require("../../models/bundle");
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
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");
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
const MIN_ORDER_PRICE = 300;

const cleanText = (value, maxLength = 300) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const positiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

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

const buildProducts = async (requestedProducts) => {
  if (!Array.isArray(requestedProducts)) throw new Error("INVALID_CART");

  const requested = requestedProducts.map((item) => ({
    productId: cleanText(item?.product_id, 80),
    amount: positiveInteger(item?.amount),
    size: cleanText(item?.size, 80),
  }));

  if (requested.some((item) => !item.productId || !item.amount)) {
    throw new Error("INVALID_CART");
  }

  const products = await Product.find({
    ...WEBSITE_PRODUCT_FILTER,
    product_id: { $in: [...new Set(requested.map(({ productId }) => productId))] },
  }).lean();
  const byId = new Map(products.map((product) => [product.product_id, product]));

  return requested.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw new Error("PRODUCT_UNAVAILABLE");

    let available = Number(product.amount) || 0;
    if (item.size) {
      const modification = product.modifications?.find(
        (entry) => entry.modificator_name === item.size
      );
      available = Number(modification?.size_left) || 0;
    }
    if (available < item.amount) throw new Error("PRODUCT_UNAVAILABLE");

    return {
      product_id: product.product_id,
      product_name: product.product_name,
      category_name: product.category_name,
      photo: product.photo,
      photo_origin: product.photo_origin,
      price: Number(product.price) || 0,
      amount: item.amount,
      ...(item.size && { size: item.size }),
    };
  });
};

const buildBundles = async (requestedBundles) => {
  if (!Array.isArray(requestedBundles) || requestedBundles.length === 0) return [];

  const requested = requestedBundles.map((item) => ({
    bundleId: cleanText(item?.bundle_id, 80),
    amount: positiveInteger(item?.amount),
    selectedSizes: new Map(
      Array.isArray(item?.products)
        ? item.products.map((product) => [String(product.product_id), cleanText(product.size, 80)])
        : []
    ),
  }));
  if (requested.some((item) => !item.bundleId || !item.amount)) {
    throw new Error("INVALID_CART");
  }

  const bundles = await Bundle.find({
    bundle_id: { $in: requested.map(({ bundleId }) => bundleId) },
    isActive: true,
  }).populate("products").lean();
  const byId = new Map(bundles.map((bundle) => [bundle.bundle_id, bundle]));

  return requested.map((item) => {
    const bundle = byId.get(item.bundleId);
    if (!bundle) throw new Error("PRODUCT_UNAVAILABLE");

    const products = bundle.products.map((product) => {
      const size = item.selectedSizes.get(String(product.product_id)) || "";
      let available = Number(product.amount) || 0;
      if (size) {
        const modification = product.modifications?.find(
          (entry) => entry.modificator_name === size
        );
        available = Number(modification?.size_left) || 0;
      }
      if (product.websiteHidden || available < item.amount) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }
      return {
        product_id: product.product_id,
        product_name: product.product_name,
        photo: product.photo,
        photo_origin: product.photo_origin,
        price: Number(product.price) || 0,
        ...(size && { size }),
      };
    });

    return {
      bundle_id: bundle.bundle_id,
      title: bundle.title,
      newPrice: Number(bundle.newPrice || bundle.price) || 0,
      amount: item.amount,
      products,
    };
  });
};

const validateCombinedAvailability = async (products, bundles) => {
  const requirements = new Map();
  const addRequirement = (productId, size, amount) => {
    const normalizedSize = cleanText(size, 80);
    const key = `${productId}:${normalizedSize}`;
    requirements.set(key, {
      productId,
      size: normalizedSize,
      amount: (requirements.get(key)?.amount || 0) + amount,
    });
  };

  products.forEach((product) =>
    addRequirement(product.product_id, product.size, product.amount)
  );
  bundles.forEach((bundle) => {
    bundle.products.forEach((product) =>
      addRequirement(product.product_id, product.size, bundle.amount)
    );
  });

  const requested = [...requirements.values()];
  const storedProducts = await Product.find({
    ...WEBSITE_PRODUCT_FILTER,
    product_id: { $in: [...new Set(requested.map((item) => item.productId))] },
  })
    .select("product_id amount modifications")
    .lean();
  const byId = new Map(storedProducts.map((product) => [product.product_id, product]));

  for (const item of requested) {
    const product = byId.get(item.productId);
    if (!product) throw new Error("PRODUCT_UNAVAILABLE");

    const available = item.size
      ? Number(
          product.modifications?.find(
            (modification) => modification.modificator_name === item.size
          )?.size_left
        ) || 0
      : Number(product.amount) || 0;

    if (available < item.amount) throw new Error("PRODUCT_UNAVAILABLE");
  }
};

const publicOrderResponse = (order) => ({
  message: "Замовлення прийнято!",
  orderId: order.orderId,
  payments: order.paymentUrl
    ? { invoiceId: order.paymentId, pageUrl: order.paymentUrl }
    : undefined,
  status: order.status,
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

  const totalPrice =
    products.reduce((sum, item) => sum + (item.price / 100) * item.amount, 0) +
    bundles.reduce((sum, item) => sum + (item.newPrice / 100) * item.amount, 0);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return res.status(400).json({ message: "Не вдалося розрахувати суму замовлення" });
  }
  if (totalPrice < MIN_ORDER_PRICE) {
    return res.status(400).json({
      message: `Мінімальна сума замовлення — ${MIN_ORDER_PRICE} грн`,
    });
  }

  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

  let order;
  try {
    order = await Order.create({
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
      totalPrice,
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
