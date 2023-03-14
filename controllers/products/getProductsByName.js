const Product = require('../../models/product');

const getProductsByName = async (req, res) => {
  const { searchReq } = req.params;
  const { page = 1, limit = 12 } = req.query;

  const query = {
    comingSoon: { $exists: false },
    $text: {
      $search: searchReq
    }
  };
  
  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  
    if (!products) {
    throw NotFound(`Products with name=${searchReq} not found...`);
    }
  
  res.json({
    products,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
};

module.exports = getProductsByName;