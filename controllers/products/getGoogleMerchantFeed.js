const Product = require("../../models/product");
const {
  WEBSITE_PRODUCT_FILTER,
} = require("../../helpers/productVisibility");
const {
  mapProductToMerchantItems,
  serializeGoogleMerchantFeed,
} = require("../../services/googleMerchantFeed");

const getGoogleMerchantFeed = async (_req, res) => {
  const products = await Product.find(
    WEBSITE_PRODUCT_FILTER,
    "product_id product_name category_name description photo photo_origin photo_extra price amount barcode modifications brand mpn google_product_category product_type color"
  ).lean();
  const items = products
    .flatMap(mapProductToMerchantItems)
    .filter((item) => item.availability === "in_stock");
  const xml = serializeGoogleMerchantFeed(items);

  res.set({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
  });
  res.status(200).send(xml);
};

module.exports = getGoogleMerchantFeed;
