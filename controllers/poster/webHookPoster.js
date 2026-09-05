const axios = require("axios");
const crypto = require("crypto");
const MD5 = require("crypto-js/md5");
const Product = require("../../models/product");
const PosterWebhookEvent = require("../../models/posterWebhookEvent");

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
  if (posterProduct.ingredient_id) {
    const byIngredientId = leftovers.find(
      (item) =>
        String(item.ingredient_id) === String(posterProduct.ingredient_id)
    );
    if (byIngredientId) return byIngredientId;
  }

  const productName = normalizeProductName(posterProduct.product_name);

  const byName = leftovers.filter(
    (item) => normalizeProductName(item.ingredient_name) === productName
  );
  if (byName.length === 1) return byName[0];

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
        barcode: String(modification.modificator_barcode || "").trim(),
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

const normalizeStockAmount = (value) =>
  Math.max(0, Math.floor(Number(value) || 0));

const updateStockFromWebhook = async (stockData, eventObjectId) => {
  const amount = normalizeStockAmount(stockData.value_absolute);
  const stockType = Number(stockData.type);
  const elementId = stockData.element_id
    ? String(stockData.element_id)
    : null;

  if (stockType === 2) {
    const productId = stockData.product_id || elementId;
    if (!productId) return;

    await Product.updateOne(
      { product_id: String(productId) },
      { $set: { amount } }
    );
    return;
  }

  if (stockType !== 3) return;

  // For modification stock events Poster puts the modification ingredient_id
  // in the outer webhook object_id. data.element_id is a different internal
  // identifier and cannot be matched to modifications[].ingredient_id.
  const modificationIngredientId = eventObjectId
    ? String(eventObjectId)
    : elementId;
  if (!modificationIngredientId) {
    throw new Error("Poster modification stock event has no ingredient id");
  }

  const product = await Product.findOne({
    "modifications.ingredient_id": modificationIngredientId,
  });

  if (!product) {
    throw new Error(
      `Poster modification not found for ingredient_id ${modificationIngredientId}`
    );
  }

  const modificationIndex = product.modifications.findIndex(
    (item) => String(item.ingredient_id) === modificationIngredientId
  );

  if (modificationIndex === -1) {
    throw new Error(
      `Poster modification not found for ingredient_id ${modificationIngredientId}`
    );
  }

  product.modifications[modificationIndex].size_left = amount;
  product.amount = product.modifications.reduce(
    (sum, item) => sum + normalizeStockAmount(item.size_left),
    0
  );
  product.markModified("modifications");

  await product.save();
};

const processPosterEvent = async (event) => {
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
      throw new Error("Invalid Poster stock payload");
    }

    await updateStockFromWebhook(stockData, event.object_id);
  }
};

const eventKeyFor = (event) =>
  crypto
    .createHash("sha256")
    .update(
      [
        event.account,
        event.object,
        event.object_id,
        event.action,
        event.data || "",
        event.time,
      ].join(";")
    )
    .digest("hex");

const webHookPoster = async (req, res) => {
  try {
    if (!POSTER_WEBHOOK_SECRET) {
      console.error("Poster webhook received while POSTER_WEBHOOK_SECRET is missing");
      return res.status(200).send("Ignored");
    }

    if (!verifyWebhook(req.body)) {
      console.warn("Poster webhook with invalid signature was ignored");
      return res.status(200).send("Ignored");
    }

    const event = req.body;
    await PosterWebhookEvent.updateOne(
      { eventKey: eventKeyFor(event) },
      {
        $setOnInsert: {
          eventKey: eventKeyFor(event),
          payload: event,
          status: "pending",
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      },
      { upsert: true, maxTimeMS: 2000 }
    );
  } catch (error) {
    // Poster stops all following deliveries when an earlier webhook does not
    // receive 200. Log intake failures, but never block Poster's queue.
    console.error("Poster webhook could not be queued:", error);
  }

  return res.status(200).send("Success");
};

module.exports = webHookPoster;
module.exports.processPosterEvent = processPosterEvent;
