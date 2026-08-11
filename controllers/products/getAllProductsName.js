const Product = require("../../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");

const getAllProductsName = async (_req, res) => {
  const productsName = await Product.distinct(
    "product_name",
    WEBSITE_PRODUCT_FILTER
  );

  res.json({ productsName, message: "okay" });
};

module.exports = getAllProductsName;
