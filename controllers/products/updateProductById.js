const Product = require("../../models/product");

const updateProductById = async (req, res) => {
  const { productId } = req.params;
  const { body } = req;
  console.log(body);
  const updateQuery = { $set: body };

  const result = await Product.findByIdAndUpdate(
    productId,
    updateQuery,
    { new: true }
  );

  if (!result) {
    throw NotFound(`Product with id=${productId} not found...`);
  }
  res.json(result);
};

module.exports = updateProductById;
