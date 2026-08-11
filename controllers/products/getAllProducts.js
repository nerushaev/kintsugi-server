const Product = require("../../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");

const getAllProducts = async (_req, res) => {
  const products = await Product.find(WEBSITE_PRODUCT_FILTER).lean();
  res.json({ products });
};

module.exports = getAllProducts;
