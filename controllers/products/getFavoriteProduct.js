const Product = require("../../models/product");

const getFavoriteProduct = async (req, res) => {
    const result = await Product.find({favorite: true});
    res.status(200).json({ message: "Favorites fetched", data: result });
  };
  

module.exports = getFavoriteProduct;
