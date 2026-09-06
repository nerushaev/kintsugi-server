const WEBSITE_EXCLUDED_CATEGORIES = ["Фіз. Магазин"];

const ACTIVE_INVENTORY_FILTER = {
  category_name: { $nin: WEBSITE_EXCLUDED_CATEGORIES },
  amount: { $gt: 0 },
  posterArchived: { $ne: true },
};

const WEBSITE_SELLABLE_FILTER = {
  category_name: { $nin: WEBSITE_EXCLUDED_CATEGORIES },
  posterArchived: { $ne: true },
  websiteHidden: { $ne: true },
  hidden: { $ne: "1" },
  price: { $gt: 3000 },
  comingSoon: { $exists: false },
};

const WEBSITE_PRODUCT_FILTER = {
  ...WEBSITE_SELLABLE_FILTER,
  amount: { $gt: 0 },
};

const isWebsiteCategory = (categoryName) =>
  !WEBSITE_EXCLUDED_CATEGORIES.includes(categoryName);

module.exports = {
  WEBSITE_EXCLUDED_CATEGORIES,
  ACTIVE_INVENTORY_FILTER,
  WEBSITE_SELLABLE_FILTER,
  WEBSITE_PRODUCT_FILTER,
  isWebsiteCategory,
};
