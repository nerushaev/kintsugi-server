const Product = require("../../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");

const getFavoriteProduct = async (_req, res) => {
  const products = await Product.find({
    ...WEBSITE_PRODUCT_FILTER,
    favorite: true,
  }).lean();

  res.status(200).json({ message: "Favorites fetched", data: products });
};

module.exports = getFavoriteProduct;
