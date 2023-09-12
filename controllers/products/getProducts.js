const Product = require('../../models/product');

const getProducts = async (req, res) => {
  const { page = 1, limit = 12, category, search } = req.query;
  const allCategories = category ? category.split(",") : [];
  const priceFilter = allCategories.includes('low') ? 'low' : allCategories.includes('high') ? 'high' : null;
  const categoryFilters = allCategories.filter(cat => cat !== 'low' && cat !== 'high');
  
  if (categoryFilters.length === 0) {
    categoryFilters.push('wigs', 'costume', 'accessories', 'smallStand', 'bigStand', 'pendant', 'pin', 'hairpins', 'earrings', 'tapestries', 'other');
  }

  const query = {
  };

  if (categoryFilters.length > 0) {
    query.category = { $in: categoryFilters };
  }
  
  if (search) {
      query.$text = {
      $search: search
    }
  }

  let sort = {};
  if (priceFilter === 'low') {
    sort.price = 1;
  } else if (priceFilter === 'high') {
    sort.price = -1;
  }

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort({ "price": sort.price })
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
