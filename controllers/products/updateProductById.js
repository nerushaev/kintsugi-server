const Product = require("../../models/product");

const updateProductById = async (req, res) => {
  const { product_id} = req.params;
  const { description} = req.body;

  const result = await Product.findOneAndUpdate({product_id: product_id}, {description: description}, {new: true});

  res.status(200).json({
    result
  });
};

module.exports = updateProductById;
