const Product = require('../../models/product');

const updateProductById = async (req, res) => {
    const { productId } = req.params;
  console.log(
    req.body
    );
    const result = await Product.findByIdAndUpdate(productId, req.body);
    if (!result) {
      throw NotFound(`Contact with id=${productId} not found...`);
    }
  
  res.json(result);
};

module.exports = updateProductById;