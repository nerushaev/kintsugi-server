const Product = require("../models/product");
const Bundle = require("../models/bundle");
const { WEBSITE_PRODUCT_FILTER } = require("../helpers/productVisibility");
const cleanText = (v, n=300) => typeof v === "string" ? v.trim().slice(0,n) : "";
const positiveInteger = v => Number.isSafeInteger(Number(v)) && Number(v)>0 ? Number(v) : 0;
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


module.exports = { buildProducts, buildBundles, validateCombinedAvailability };
