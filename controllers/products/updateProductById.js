const { update } = require('../../models/product');
const Product = require('../../models/product');

const updateProductById = async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);
  const amount = product.amount - req.body.amount;
  req.body.amount = amount;
  const result = await Product.findByIdAndUpdate(productId, req.body);
    if (!result) {
      throw NotFound(`Contact with id=${productId} not found...`);
    }
  
  res.json(result);
};

module.exports = updateProductById;