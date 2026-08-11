const Product = require("../../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");

const getWishListProduct = async (req, res) => {
  const wishes = Array.isArray(req.user?.wishes) ? req.user.wishes : [];
  const products = await Product.find({
    ...WEBSITE_PRODUCT_FILTER,
    product_id: { $in: wishes },
  }).lean();

  res.status(200).json({ products });
};

module.exports = getWishListProduct;
