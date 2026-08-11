const { success } = require("../../helpers/response.js");
const Product = require("../../models/product.js");

const toPositiveQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const addRequirement = (requirements, product, multiplier = 1) => {
  const productId = String(product?.product_id || "");
  const quantity = toPositiveQuantity(product?.amount) * multiplier;
  if (!productId || quantity <= 0) return;

  const size = typeof product.size === "string" ? product.size.trim() : "";
  const key = `${productId}:${size}`;
  const current = requirements.get(key);

  requirements.set(key, {
    productId,
    size,
    requiredAmount: (current?.requiredAmount || 0) + quantity,
  });
};

const checkAvailability = async (req, res) => {
  const productBusket = Array.isArray(req.body.productBusket)
    ? req.body.productBusket
    : [];
  const bundleBusket = Array.isArray(req.body.bundleBusket)
    ? req.body.bundleBusket
    : [];
  const requirements = new Map();

  productBusket.forEach((product) => addRequirement(requirements, product));

  bundleBusket.forEach((bundle) => {
    const bundleQuantity = toPositiveQuantity(bundle?.amount);
    if (!bundleQuantity || !Array.isArray(bundle?.products)) return;
    bundle.products.forEach((product) =>
      addRequirement(requirements, product, bundleQuantity)
    );
  });

  const requestedItems = [...requirements.values()];
  const productIds = [...new Set(requestedItems.map(({ productId }) => productId))];
  const products = await Product.find(
    { product_id: { $in: productIds } },
    "product_id product_name amount modifications"
  ).lean();
  const productsById = new Map(
    products.map((product) => [product.product_id, product])
  );
  const unavailableProducts = [];

  for (const requirement of requestedItems) {
    const product = productsById.get(requirement.productId);

    if (!product) {
      unavailableProducts.push({
        ...requirement,
        availableAmount: 0,
        message: `Товар з ID ${requirement.productId} не знайдено.`,
      });
      continue;
    }

    let availableAmount = Number(product.amount) || 0;

    if (requirement.size) {
      const modification = product.modifications?.find(
        (item) => item.modificator_name === requirement.size
      );
      availableAmount = Number(modification?.size_left) || 0;
    }

    if (availableAmount < requirement.requiredAmount) {
      unavailableProducts.push({
        ...requirement,
        productName: product.product_name,
        availableAmount,
        message: `Недостатньо товару «${product.product_name}». Потрібно ${requirement.requiredAmount}, доступно ${availableAmount}.`,
      });
    }
  }

  if (unavailableProducts.length) {
    return success(
      res,
      { availableProducts: false, unavailableProducts },
      "Деяких товарів недостатньо."
    );
  }

  return success(
    res,
    { availableProducts: true, unavailableProducts: [] },
    "Всі товари в наявності."
  );
};

module.exports = checkAvailability;
