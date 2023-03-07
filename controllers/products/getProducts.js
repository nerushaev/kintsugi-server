const Product = require('../../models/product');

const getProducts = async (req, res) => {
  const { page = 1, limit = 6, category } = req.query;

  if (category) {
    const count = await Product.countDocuments({ category });
    console.log(count);
    const products = await Product.find({ category, comingSoon: { $exists: false } })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec()
    
      res.json({
    products,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
  } else {
    const count = await Product.countDocuments({ comingSoon: { $exists: false } });
    const products = await Product.find({ comingSoon: { $exists: false } })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
      res.json({
    products,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
  }


  

};

module.exports = getProducts;