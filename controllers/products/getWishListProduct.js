const Product = require("../../models/product");

const getWishListProduct = async (req, res) => {
  console.log("🚀 Контроллер вызван");
  const { user } = req;
  const { wishes } = user;
  const result = await Product.find().where("product_id").in(wishes).exec();

  res.status(200).json({
    products: result,
  });
};

module.exports = getWishListProduct;
