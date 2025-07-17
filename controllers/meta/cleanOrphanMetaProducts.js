const Product = require("../../models/product");
const ProductMeta = require('../../models/productsMeta');

async function cleanOrphanMetaProducts() {
  // 1. Получаем все product_id из коллекции товаров
  const productIds = await Product.distinct('product_id');
    console.log(productIds)
  // 2. Находим мета-объекты, чей product_id не найден среди товаров
  const orphanMetaProducts = await ProductMeta.find({
    product_id: { $nin: productIds }
  });

  console.log('Найдено мета-объектов без продукта:', orphanMetaProducts.length);

  if (orphanMetaProducts.length > 0) {
    // 3. Удаляем их
    await ProductMeta.deleteMany({
      product_id: { $nin: productIds }
    });
    console.log('Удаление завершено!');
  } else {
    console.log('Все мета-объекты привязаны к продуктам.');
  }
}

module.exports = cleanOrphanMetaProducts;