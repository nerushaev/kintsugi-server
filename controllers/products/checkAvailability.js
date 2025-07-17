const { failure, success } = require("../../helpers/response.js");
const Product = require("../../models/product.js");


const checkAvailability = async (req, res) => {
  const { bundleBusket, productBusket } = req.body;

  // Массив для хранения результатов
  const unavailableProducts = [];

  // Проверяем обычные продукты в корзине
  for (const product of productBusket) {
    const productId = product.product_id;
    const requiredAmount = product.amount;

    // Проверяем, сколько этого продукта есть в базе
    const productInDB = await Product.findOne({ product_id: productId });
    
    if (!productInDB) {
      unavailableProducts.push({
        productId,
        message: `Продукт с ID ${productId} не найден в базе данных.`
      });
    } else {
      const availableAmount = productInDB.amount;

      // Если в базе меньше товара, чем в корзине, добавляем в unavailableProducts
      if (availableAmount < requiredAmount) {
        unavailableProducts.push({
          productId,
          requiredAmount,
          availableAmount,
          message: `Недостатньо товарів. Потрібно ${requiredAmount}, в наявності тільки ${availableAmount}.`
        });
      }
    }
  }

  // Проверяем продукты в бандле
  for (const bundle of bundleBusket) {
    const { products, amount: bundleAmount } = bundle;

    for (const product of products) {
      const productId = product.product_id;
      const requiredAmount = product.amount * bundleAmount;

      // Проверяем, сколько этого продукта есть в базе
      const productInDB = await Product.findOne({ product_id: productId });
      
      if (!productInDB) {
        unavailableProducts.push({
          productId,
          message: `Товар з ID ${productId} не знайдено в базі даних.`
        });
      } else {
        const availableAmount = productInDB.amount;

        // Если в базе меньше товара, чем в корзине, добавляем в unavailableProducts
        if (availableAmount < requiredAmount) {
          unavailableProducts.push({
            productId,
            requiredAmount,
            availableAmount,
            message: `Недостатньо товарів. Потрібно ${requiredAmount}, в наявності тільки ${availableAmount}.`
          });
        }
      }
    }
  }

  // Если есть продукты, которых нет в наличии, возвращаем их список
  if (unavailableProducts.length > 0) {
  return success(res, { availableProducts: false, unavailableProducts }, "Деяких товарів недостатньо.");
    
}

  // Если все товары в наличии, возвращаем успешный ответ
  return success(res, { availableProducts: true }, "Всі товари в наявності.");
};

module.exports = checkAvailability;
