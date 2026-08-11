const WEBSITE_EXCLUDED_CATEGORIES = ["Фіз. Магазин"];

const ACTIVE_INVENTORY_FILTER = {
  category_name: { $nin: WEBSITE_EXCLUDED_CATEGORIES },
  amount: { $gt: 0 },
};

const WEBSITE_PRODUCT_FILTER = {
  ...ACTIVE_INVENTORY_FILTER,
  websiteHidden: { $ne: true },
};

const isWebsiteCategory = (categoryName) =>
  !WEBSITE_EXCLUDED_CATEGORIES.includes(categoryName);

module.exports = {
  WEBSITE_EXCLUDED_CATEGORIES,
  ACTIVE_INVENTORY_FILTER,
  WEBSITE_PRODUCT_FILTER,
  isWebsiteCategory,
};
