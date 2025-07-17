const Product = require("../../models/product.js");
const ProductMeta = require("../../models/productsMeta.js");

const run = async () => {
  const products = await Product.find({});
  console.log(`Всего товаров: ${products.length}`);

  // Удаляем все метаданные перед созданием новых
  await ProductMeta.deleteMany({});
  console.log("✅ Все старые метаданные удалены.");

  // Создаём новые мета-данные для всех товаров
  for (const product of products) {
    const productId = product.product_id;
    if (!productId) continue;

    const meta = new ProductMeta({
      product_id: productId,
      tags: [],
      type: [],
      material: [],
      color: [],
      fandom: [],
      character: [],
      isPopular: false,
      isLimited: false,
      customTitle: null,
      customDescription: null,
      customImage: null,
      gender: [],
    });

    await meta.save();
    console.log(`✅ Мета создана для товара: ${product.product_name}`);
  }

  console.log("🎉 Все мета-записи созданы заново.");
};

module.exports = run;
