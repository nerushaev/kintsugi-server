const Product = require("../../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../../helpers/productVisibility");

const hasImage = (product) =>
  Boolean(
    product.photo ||
      product.photo_origin ||
      (Array.isArray(product.photo_extra) && product.photo_extra.length)
  );

const hasDescription = (product) =>
  typeof product.description === "string" && product.description.trim().length > 0;

const getMetaStatus = async (_req, res) => {
  const products = await Product.find(
    WEBSITE_PRODUCT_FILTER,
    "product_id photo photo_origin photo_extra description"
  ).lean();
  const productIds = [...new Set(products.map(({ product_id }) => product_id))];
  const productsWithoutPhotoIds = [];
  const productsWithoutDescriptionIds = [];
  const criticalIssueIds = new Set();

  for (const product of products) {
    const productId = product.product_id;
    const missingPhoto = !hasImage(product);
    const missingDescription = !hasDescription(product);

    if (missingPhoto) productsWithoutPhotoIds.push(productId);
    if (missingDescription) productsWithoutDescriptionIds.push(productId);
    if (missingPhoto || missingDescription) criticalIssueIds.add(productId);
  }

  const productsRequiringAttentionCount = criticalIssueIds.size;

  res.json({
    totalProducts: productIds.length,
    readyProductsCount: productIds.length - criticalIssueIds.size,
    productsRequiringAttentionCount,
    criticalIssueCount: criticalIssueIds.size,
    productsWithoutPhotoCount: new Set(productsWithoutPhotoIds).size,
    productsWithoutDescriptionCount: new Set(productsWithoutDescriptionIds).size,
    productsWithoutPhotoIds: [...new Set(productsWithoutPhotoIds)],
    productsWithoutDescriptionIds: [...new Set(productsWithoutDescriptionIds)],
  });
};

module.exports = getMetaStatus;
