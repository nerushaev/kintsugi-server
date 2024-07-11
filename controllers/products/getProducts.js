const { default: axios } = require("axios");
const Order = require("../../models/order");
const Product = require("../../models/product");
const {POSTER_URL_API, POSTER_ACCESS_TOKEN} = process.env;
const getProducts = async (req, res) => {
  const { page = 1, limit = 15, category, search, price } = req.query;
  // await Product.deleteMany({});

  // const { data } = await axios.get(
  //   `${POSTER_URL_API}/menu.getProducts?token=${POSTER_ACCESS_TOKEN}`
  // );

  // data.response.map((item) => {
  //   const {
  //     product_name,
  //     category_name,
  //     product_id,
  //     menu_category_id,
  //     photo,
  //     photo_origin,
  //     price,
  //     barcode,
  //     hidden,
  //     modifications
  //   } = item;

  //   const modPrice = modifications ? Number(modifications[0].modificator_selfprice) : 0;
  //   const spotsPrice = modifications ? Number(modifications[0].spots[0].price) : 0;

  //   let newPrice;

  //   if(price) {
  //     newPrice = Number(price[1]);
  //   } else if (modPrice !== 0) {
  //     newPrice = modPrice;
  //   } else {
  //     newPrice = spotsPrice;
  //   }
  

  //   Product.create({
  //     product_name,
  //     category_name,
  //     product_id,
  //     menu_category_id,
  //     photo,
  //     photo_origin,
  //     price: newPrice,
  //     barcode,
  //     hidden,
  //     modifications,
  //   });
  // });

  const query = {

  };

  if(category) {
    query.category_name = category
  }


  if (search) {
      query.$text = {
      $search: search
    }
  }


  let sort = {};
  if (price === 'low') {
    sort.price = 1;
  } else if (price === 'high') {
    sort.price = -1;
  }

  const count = await Product.countDocuments(query);

  if(sort.price) {
    const products = await Product.find(query)
    .sort({'price': sort.price})
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      message: "okay"
    });
  } else {
    const products = await Product.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  res.json({
    products,
    totalPages: Math.ceil(count / limit),
    currentPage: Number(page),
    message: "okay"
  });
  }

};

module.exports = getProducts;
