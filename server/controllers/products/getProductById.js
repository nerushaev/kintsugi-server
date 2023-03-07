const Product = require('../../models/product');

const getProductById = async (req, res) => {
  const productsId = req.params;
  const product = await Product.findById(productsId);
  if (!product) {
    throw NotFound(`Contact with id=${elements} not found...`);
  }
  
  res.json(product);
};

module.exports = getProductById;