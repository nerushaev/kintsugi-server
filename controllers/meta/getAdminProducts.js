const Product = require("../../models/product");

const getAdminProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      price,
      category,
      priorityIds = []
    } = req.body;

    const query = {
      amount: { $gt: 0 },
      price: { $gt: 3000 },
    };

    if (category) {
      query.category_name = category;
    }

    let sort = {};
    if (price === "low") {
      sort.price = 1;
    } else if (price === "high") {
      sort.price = -1;
    }

    const parsedPriorityIds = Array.isArray(priorityIds) ? priorityIds : [];

    // 📌 Если есть поиск — используем $search (Atlas Search)
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

      // Сортировка по priorityIds
      foundProducts = sortProductsWithPriority(foundProducts, parsedPriorityIds);

      const paginatedProducts = foundProducts.slice((page - 1) * limit, page * limit);

      return res.json({
        products: paginatedProducts,
        totalPages: Math.ceil(foundProducts.length / limit),
        currentPage: Number(page),
      });
    }

    // 📌 Если поиска нет — обычный запрос
    let products = await Product.find(query)
      .sort(Object.keys(sort).length ? sort : { createdAt: -1, _id: -1 })
      .lean()
      .exec();

    // Сортировка по priorityIds
    products = sortProductsWithPriority(products, parsedPriorityIds);

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

// 🔥 Функция сортировки проблемных товаров
function sortProductsWithPriority(products, priorityIds) {
  if (!priorityIds.length) return products;

  return products.sort((a, b) => {
    const aHasProblem = priorityIds.includes(a.product_id);
    const bHasProblem = priorityIds.includes(b.product_id);

    if (aHasProblem && !bHasProblem) return -1;
    if (!aHasProblem && bHasProblem) return 1;
    return 0;
  });
}

module.exports = getAdminProducts;
