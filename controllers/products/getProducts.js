const Product = require('../../models/product');

const getProducts = async (req, res) => {
  const { page = 1, limit = 6, category } = req.query;
  const allCategories = category ? category.split(",") : [];

  const excludedCategories = ["low", "high"];
  const filteredCategories = allCategories.filter((cat) => !excludedCategories.includes(cat));

  const query = {
    comingSoon: { $exists: false }
  };

  if (allCategories.length > 0) {
    query.category = { $in: filteredCategories };
  }

  let sort = {};
  if (allCategories.includes("low")) {
    sort.price = 1;
  } else if (allCategories.includes("high")) {
    sort.price = -1;
  }

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sort)
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
