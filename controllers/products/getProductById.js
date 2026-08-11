const Product = require("../../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");

const getProductById = async (req, res) => {
  const productIds = String(req.params._id || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const products = await Product.find({
    ...WEBSITE_PRODUCT_FILTER,
    product_id: { $in: productIds },
  }).lean();

  if (!products.length) {
    return res.status(404).json({ message: "Товар не знайдено" });
  }

  res.json(products.length === 1 ? products[0] : products);
};

module.exports = getProductById;
