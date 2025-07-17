const Product = require("../../models/product");
const ProductMeta = require("../../models/productsMeta");

const getMetaStatus = async (req, res) => {
  try {
    const productIds = await Product.distinct('product_id');
    const metas = await ProductMeta.find({}, 'product_id tags type color fandom character');

    // Список id товаров, для которых есть meta
    const metaProductIds = metas.map(meta => meta.product_id);

    // Товары без meta вообще
    const productsWithoutMeta = productIds.filter(id => !metaProductIds.includes(id));

    // Товары, у которых meta есть, но поля пустые
    const metasWithMissingFields = metas.filter(meta => {
      return (
        !meta.tags || meta.tags.length === 0 ||
        !meta.type || meta.type.length === 0 ||
        !meta.color || meta.color.length === 0 
      );
    });

    const productsWithBadMetaIds = metasWithMissingFields.map(meta => meta.product_id);

    res.json({
      totalProducts: productIds.length,
      productsWithoutMetaCount: productsWithoutMeta.length,
      productsWithBadMetaCount: productsWithBadMetaIds.length,
      productsWithoutMetaIds: productsWithoutMeta,
      productsWithBadMetaIds: productsWithBadMetaIds,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка получения статуса мета-данных' });
  }
};

module.exports = getMetaStatus;
