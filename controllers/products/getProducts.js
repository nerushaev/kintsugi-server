const { default: axios } = require("axios");
const Product = require("../../models/product");
const {POSTER_URL_API, POSTER_ACCESS_TOKEN} = process.env;
const getProducts = async (req, res) => {
  const { page = 1, limit = 15, category, search } = req.query;

  // await Product.deleteMany({});

  // const { data } = await axios.get(
  //   `${POSTER_URL_API}/menu.getProducts?token=${POSTER_ACCESS_TOKEN}`
  // );
  //   console.log(data);

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
  //   } = item;
  //   Product.create({
  //     product_name,
  //     category_name,
  //     product_id,
  //     menu_category_id,
  //     photo,
  //     photo_origin,
  //     price: Number(price[1]),
  //     barcode,
  //     hidden,
  //   });
  // });


  const allCategories = category ? category.split(",") : [];
  const priceFilter = allCategories.includes('low') ? 'low' : allCategories.includes('high') ? 'high' : null;
  const categoryFilters = allCategories.filter(cat => cat !== 'low' && cat !== 'high');

  if (categoryFilters.length === 0) {
    categoryFilters.push('Мерч');
  }

  const query = {
  };

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
    currentPage: page,
    message: "okay"
  });
};

module.exports = getProducts;
