const Product = require('../../models/product');

const getProductsByName = async (req, res) => {
  const { page = 1, limit = 12, search } = req.query;
  console.log("search", search);

  const query = {
    amount: { $gt: 0 },
    price: { $gt: 3000 },
  };

  // Если используете Atlas Search
  const pipeline = [
    {
      $search: {
        index: "search", // убедитесь, что такой поисковый индекс создан в Atlas Search
        text: {
          query: search, // например, "Нар"
          path: "product_name",
          fuzzy: {
            maxEdits: 2,
            prefixLength: 1
          }
        }
      }
      
    },
    { $match: { comingSoon: { $exists: false }, ...query } },
    { $skip: (page - 1) * Number(limit) },
    { $limit: Number(limit) }
  ];

  // Выполняем агрегатный запрос
  const products = await Product.aggregate(pipeline);

  // Можно посчитать количество найденных документов, например, через дополнительный pipeline или возвращать длину массива:
  const count = products.length;

  if (!products || count === 0) {
    // Здесь можно выбросить ошибку или вернуть пустой результат
    throw new Error(`Products with name=${search} not found...`);
  }

  res.json({
    products,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
};

module.exports = getProductsByName;
