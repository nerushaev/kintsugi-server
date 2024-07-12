const Product = require("../../models/product");

const getAllProductsName = async (req, res) => {

  const result = await Product.find();

  const productsName = result.map(item => {
    return item.product_name;
  })

  console.log(productsName);



  res.json({
    productsName,
    message: "okay"
  });
};

module.exports = getAllProductsName;