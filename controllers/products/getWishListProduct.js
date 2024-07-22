const Product = require("../../models/product");

const getWishListProduct = async (req, res) => {
  const {wishes} = req.params;
  console.log(wishes);

  const productsId = wishes.split(',');
  
  const result = await Product.find().where('product_id').in(productsId).exec();

  console.log(result);

  res.status(200).json({
    products: result
  });
}

module.exports = getWishListProduct;