const Product = require('../../models/product');

const getAllProducts = async (req, res) => {
  const products = await Product.find()

  res.json({products});
}

module.exports = getAllProducts;