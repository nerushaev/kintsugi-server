const { default: axios } = require("axios");
const Order = require("../../models/order");
const Product = require("../../models/product");
const { POSTER_URL_API, POSTER_ACCESS_TOKEN } = process.env;

const getProducts = async (req, res) => {
  const { page = 1, limit = 20, category, search, price } = req.query;
  // await Order.deleteMany({});
  // await Product.deleteMany({});

  // const { data } = await axios.get(
  //   `${POSTER_URL_API}/menu.getProducts?token=${POSTER_ACCESS_TOKEN}`
  // );

  // const modificatorsAmount = await axios.get(
  //   `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=3&zero_leftovers=true`
  // );
  // const productsAmount = await axios.get(
  //   `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=2&zero_leftovers=true`
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
  //     modifications,
  //   } = item;

  //   if (modifications) {
  //     const { response } = modificatorsAmount.data;
  //     // Перебираем массив модификаций товара и находим к каждому модификатору
  //     // соответствующий ему обьект на складе
  //     const resultAmountWithModificators = modifications.map((modificator) => {
  //       const modificatorAmount = response.filter((item) => {
  //         if (item.ingredient_id === modificator.ingredient_id) {
  //           return item;
  //         }
  //       });
  //       const resultModification = {
  //         ingredient_id: modificator.ingredient_id,
  //         modificator_name: modificator.modificator_name,
  //         size_left: Math.floor(Number(modificatorAmount[0].ingredient_left)),
  //         modificator_price: Number(modificator.spots[0].price),
  //       };
  //       return resultModification;
  //     });

  //     let totalAmount = 0;
  //     resultAmountWithModificators.map((item) => {
  //       return (totalAmount += item.size_left);
  //     });

  //     const productItem = {
  //       product_name,
  //       category_name,
  //       product_id,
  //       menu_category_id,
  //       photo,
  //       photo_origin,
  //       price: resultAmountWithModificators[0].modificator_price,
  //       barcode,
  //       hidden,
  //       modifications: resultAmountWithModificators,
  //       amount: totalAmount,
  //     };

  //     Product.create({
  //       ...productItem,
  //     });
  //   } else {
  //     const { response } = productsAmount.data;

  //     const productsResultAmount = response.filter((amountProd) => {
  //       if (amountProd.ingredient_name === product_name) {
  //         return amountProd;
  //       }
  //     });

  //   const spotsPrice = modifications
  //     ? Number(modifications[0].spots[0].price)
  //     : 0;

  //   let newPrice;

  //   if (price) {
  //     newPrice = Number(price[1]);
  //   } else {
  //     newPrice = spotsPrice;
  //   }

  //     const productItem = {
  //       product_name,
  //       category_name,
  //       product_id,
  //       menu_category_id,
  //       photo,
  //       photo_origin,
  //       price: newPrice,
  //       barcode,
  //       hidden,
  //       amount: Math.floor(Number(productsResultAmount[0].ingredient_left)),
  //     };

  //     Product.create({
  //       ...productItem,
  //     });
  //   }
  // });

  const query = {
    amount: { $gt: 0 },
    price: { $gt: 3000 },
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
    message: "okay",
  });
  }
};

module.exports = getProducts;
