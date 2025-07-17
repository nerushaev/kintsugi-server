const Product = require('../../models/product');

const getProductById = async (req, res) => {
  console.log('here')
  const productsId = req.params;
  const result = productsId._id.split(",");

  const product = await Product.find({product_id: result});
  if (!product) {
    throw NotFound(`Contact with id=${elements} not found...`);
  }
  res.json(product.length === 1 ? product[0] : product);
};

module.exports = getProductById;