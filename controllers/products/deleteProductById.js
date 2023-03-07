const Product = require('../../models/product');

const removeProductById = async (req, res) => {
  const { productId } = req.params;

  const result = await Product.findByIdAndRemove(productId);

  if (!result) {
    throw NotFound(`Contact with id=${productId} not found...`);
  }
  
  res.json(result);
}
module.exports = removeProductById;