const Product = require("../../models/product");
const ProductMeta = require("../../models/productsMeta");

const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      price,
      sortByMetaIssues = false,
    } = req.query;

    const { category } = req.params;

    const query = {
      amount: { $gt: 0 },
      price: { $gt: 3000 },
    };

    if (category) {
      query.category_name = category;
    }

    let sort = {};
    if (price === 'low') {
      sort.price = 1;
    } else if (price === 'high') {
      sort.price = -1;
    }

    let metaProblemIds = [];

    if (sortByMetaIssues === 'true') {
      // Найти товары с проблемной мета
      const metas = await ProductMeta.find({}, 'product_id tags type color fandom character').lean();
      const badMetaIds = new Set();

      for (const meta of metas) {
        const { product_id, tags, type, color, fandom, character } = meta;
        if (
          !tags?.length ||
          !type?.length ||
          !color?.length ||
          !fandom?.length ||
          !character?.length
        ) {
          badMetaIds.add(product_id);
        }
      }

      const allProductIdsWithMeta = new Set(metas.map(meta => meta.product_id));
      const productsWithoutMeta = await Product.find({ product_id: { $nin: Array.from(allProductIdsWithMeta) } }, 'product_id').lean();
      productsWithoutMeta.forEach(p => badMetaIds.add(p.product_id));

      metaProblemIds = Array.from(badMetaIds);
    }

    // 📌 Если есть поиск через Atlas Search
    if (search) {
      const pipeline = [
        {
          $search: {
            index: "search",
            text: {
              query: search,
              path: "product_name",
              fuzzy: {
                maxEdits: 2,
                prefixLength: 1,
              },
            },
          },
        },
        { $match: { comingSoon: { $exists: false }, ...query } },
      ];

      let foundProducts = await Product.aggregate(pipeline);

      if (sortByMetaIssues === 'true' && metaProblemIds.length > 0) {
        foundProducts = sortProductsWithMetaIssues(foundProducts, metaProblemIds);
      }

      const paginatedProducts = foundProducts.slice((page - 1) * limit, page * limit);

      return res.json({
        products: paginatedProducts,
        totalPages: Math.ceil(foundProducts.length / limit),
        currentPage: Number(page),
      });
    }

    // 📌 Без поиска
    let products = await Product.find(query)
      .sort(Object.keys(sort).length ? sort : { createdAt: -1, _id: -1 })
      .lean()
      .exec();

    if (sortByMetaIssues === 'true' && metaProblemIds.length > 0) {
      products = sortProductsWithMetaIssues(products, metaProblemIds);
    }

    const paginatedProducts = products.slice((page - 1) * limit, page * limit);

    return res.json({
      products: paginatedProducts,
      totalPages: Math.ceil(products.length / limit),
      currentPage: Number(page),
    });

  } catch (error) {
    console.error("Ошибка получения товаров:", error);
    res.status(500).json({ message: "Ошибка сервера при получении товаров" });
  }
};

// 🔥 Функция сортировки проблемных товаров вверх
function sortProductsWithMetaIssues(products, badMetaIds) {
  return products.sort((a, b) => {
    const aBad = badMetaIds.includes(a.product_id);
    const bBad = badMetaIds.includes(b.product_id);

    if (aBad && !bBad) return -1;
    if (!aBad && bBad) return 1;
    return 0;
  });
}

module.exports = getProducts;


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