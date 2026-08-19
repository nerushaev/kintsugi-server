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

const normalizeProductName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("uk-UA");

const findProductLeftover = (leftovers, posterProduct) => {
  const productName = normalizeProductName(posterProduct.product_name);

  // Poster product_id and storage ingredient_id are not guaranteed to be the
  // same. Prefer the exact product name so an unrelated ingredient with a
  // coincidentally matching id cannot zero out the product stock.
  const byName = leftovers.find(
    (item) => normalizeProductName(item.ingredient_name) === productName
  );
  if (byName) return byName;

  return leftovers.find(
    (item) => String(item.ingredient_id) === String(posterProduct.product_id)
  );
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
  const leftover = findProductLeftover(leftovers, posterProduct);

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
    // Only Poster-owned skeleton fields are updated here. All content added
    // in the site admin (description, extra photos, characteristics,
    // popularity and manual visibility) remains untouched.
    { $set: { ...product, posterArchived: false } },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const syncPosterProductStock = async (productId) => {
  const posterProduct = await posterRequest("menu.getProduct", {
    product_id: productId,
  });
  const stock = await buildPosterProduct(posterProduct);
  const existingProduct = await Product.findOne({
    product_id: String(productId),
  });

  if (!existingProduct) {
    await Product.create({ ...stock, posterArchived: false });
    return;
  }

  const update = { amount: stock.amount };

  if (stock.modifications.length > 0) {
    const stockByIngredient = new Map(
      stock.modifications.map((item) => [String(item.ingredient_id), item.size_left])
    );
    update.modifications = existingProduct.modifications.map((item) => ({
      ...item.toObject(),
      size_left:
        stockByIngredient.get(String(item.ingredient_id)) ?? item.size_left,
    }));
  }

  await Product.updateOne(
    { product_id: String(productId) },
    { $set: update }
  );
};

const syncPosterStockElement = async (elementId) => {
  const leftovers = await posterRequest("storage.getStorageLeftovers", {
    type: 2,
    zero_leftovers: true,
  });
  const leftover = leftovers.find(
    (item) => String(item.ingredient_id) === String(elementId)
  );

  if (!leftover?.ingredient_name) return;

  const localProduct = await Product.findOne({
    product_name: leftover.ingredient_name,
  }).select("product_id");

  if (localProduct?.product_id) {
    await syncPosterProductStock(localProduct.product_id);
    return;
  }

  // A stock event can arrive before the product event. Locate the Poster
  // product by its exact name and create it instead of silently dropping it.
  const posterProducts = await posterRequest("menu.getProducts");
  const posterProduct = posterProducts.find(
    (item) =>
      normalizeProductName(item.product_name) ===
      normalizeProductName(leftover.ingredient_name)
  );

  if (posterProduct?.product_id) {
    await syncPosterProduct(posterProduct.product_id);
  }
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
      // Poster is the inventory skeleton, while the site owns the enriched
      // product content. Never delete that content when a Poster product is
      // removed: archive it and restore it automatically if Poster sends the
      // product again later.
      await Product.updateOne(
        { product_id: String(event.object_id) },
        { $set: { posterArchived: true, amount: 0 } }
      );
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
      await syncPosterProductStock(stockData.product_id);
    } else if (stockData.element_id) {
      await syncPosterStockElement(stockData.element_id);
    }
  }

  return res.status(200).send("Success");
};

module.exports = webHookPoster;
