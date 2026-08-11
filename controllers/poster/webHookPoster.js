const axios = require("axios");
const crypto = require("crypto");
const MD5 = require("crypto-js/md5");
const Product = require("../../models/product");

const {
  POSTER_URL_API,
  POSTER_ACCESS_TOKEN,
  POSTER_WEBHOOK_SECRET,
} = process.env;

const posterRequest = async (method, params = {}) => {
  const { data } = await axios.get(`${POSTER_URL_API}/${method}`, {
    params: { token: POSTER_ACCESS_TOKEN, ...params },
    timeout: 15000,
  });

  if (data?.error || data?.response == null) {
    throw new Error(`Poster ${method} returned an invalid response`);
  }

  return data.response;
};

const verifyWebhook = (payload) => {
  if (!POSTER_WEBHOOK_SECRET || typeof payload?.verify !== "string") {
    return false;
  }

  const parts = [
    payload.account,
    payload.object,
    payload.object_id,
    payload.action,
  ];
  if (payload.data) parts.push(payload.data);
  parts.push(payload.time, POSTER_WEBHOOK_SECRET);

  const expected = MD5(parts.join(";")).toString();
  const receivedBuffer = Buffer.from(payload.verify);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const firstPrice = (price) => {
  if (price == null) return 0;
  if (typeof price === "number" || typeof price === "string") {
    return Number(price) || 0;
  }

  const values = Object.values(price).map(Number).filter(Number.isFinite);
  return Number(price[1]) || values[0] || 0;
};

const buildPosterProduct = async (posterProduct) => {
  const modifications = Array.isArray(posterProduct.modifications)
    ? posterProduct.modifications
    : [];

  if (modifications.length > 0) {
    const leftovers = await posterRequest("storage.getStorageLeftovers", {
      type: 3,
      zero_leftovers: true,
    });
    const amountByIngredient = new Map(
      leftovers.map((item) => [String(item.ingredient_id), item])
    );
    const normalizedModifications = modifications.map((modification) => {
      const leftover = amountByIngredient.get(String(modification.ingredient_id));
      return {
        ingredient_id: modification.ingredient_id,
        modificator_name: modification.modificator_name,
        size_left: Math.max(0, Math.floor(Number(leftover?.ingredient_left) || 0)),
        modificator_price:
          firstPrice(modification.spots?.[0]?.price) ||
          Number(modification.modificator_selfprice) ||
          0,
      };
    });

    return {
      product_name: posterProduct.product_name,
      category_name: posterProduct.category_name,
      product_id: String(posterProduct.product_id),
      menu_category_id: posterProduct.menu_category_id,
      photo: posterProduct.photo,
      photo_origin: posterProduct.photo_origin,
      price: normalizedModifications[0]?.modificator_price || firstPrice(posterProduct.price),
      barcode: posterProduct.barcode,
      hidden: posterProduct.hidden,
      modifications: normalizedModifications,
      amount: normalizedModifications.reduce((sum, item) => sum + item.size_left, 0),
    };
  }

  const leftovers = await posterRequest("storage.getStorageLeftovers", {
    type: 2,
    zero_leftovers: true,
  });
  const leftover = leftovers.find(
    (item) =>
      String(item.ingredient_id) === String(posterProduct.product_id) ||
      item.ingredient_name === posterProduct.product_name
  );

  return {
    product_name: posterProduct.product_name,
    category_name: posterProduct.category_name,
    product_id: String(posterProduct.product_id),
    menu_category_id: posterProduct.menu_category_id,
    photo: posterProduct.photo,
    photo_origin: posterProduct.photo_origin,
    price: firstPrice(posterProduct.price),
    barcode: posterProduct.barcode,
    hidden: posterProduct.hidden,
    modifications: [],
    amount: Math.max(0, Math.floor(Number(leftover?.ingredient_left) || 0)),
  };
};

const syncPosterProduct = async (productId) => {
  const posterProduct = await posterRequest("menu.getProduct", {
    product_id: productId,
  });
  const product = await buildPosterProduct(posterProduct);

  await Product.findOneAndUpdate(
    { product_id: String(product.product_id) },
    { $set: product },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const webHookPoster = async (req, res) => {
  if (!POSTER_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Poster webhook is not configured" });
  }
  if (!verifyWebhook(req.body)) {
    return res.status(400).json({ message: "Invalid Poster signature" });
  }

  const event = req.body;

  if (event.object === "product") {
    if (event.action === "removed") {
      await Product.deleteOne({ product_id: String(event.object_id) });
    } else if (event.action === "added" || event.action === "changed") {
      await syncPosterProduct(event.object_id);
    }
  }

  if (event.object === "stock" && event.action === "changed") {
    let stockData;
    try {
      stockData = JSON.parse(event.data || "{}");
    } catch {
      return res.status(400).json({ message: "Invalid Poster stock payload" });
    }

    if (stockData.product_id) {
      await syncPosterProduct(stockData.product_id);
    } else if (stockData.element_id) {
      await Product.findOneAndUpdate(
        { product_id: String(stockData.element_id) },
        { $set: { amount: Math.max(0, Number(stockData.value_absolute) || 0) } }
      );
    }
  }

  return res.status(200).send("Success");
};

module.exports = webHookPoster;
