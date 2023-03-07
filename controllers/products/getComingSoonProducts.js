const Product = require('../../models/product');

const getComingSoonProducts = async (req, res) => {
  const products = await Product.find({ comingSoon: 'on' });

  res.json({products});
}

module.exports = getComingSoonProducts;