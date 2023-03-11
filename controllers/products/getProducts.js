const Product = require('../../models/product');

const getProducts = async (req, res) => {
  const { page = 1, limit = 6, category } = req.query;
  const categories = category ? category.split(",") : [];

  const query = {
    comingSoon: { $exists: false }
  };
  if (categories.length > 0) {
    query.category = { $in: categories };
  }
  console.log(query);

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  res.json({
    products,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
};

module.exports = getProducts;
