const getProducts = require("./getProducts");
const addProduct = require("./addProduct");
const getProductById = require("./getProductById");
const removeProductById = require("./deleteProductById");
const updatePhotoProductById = require("./updatePhotoProductById");
const getAllProducts = require("./getAllProducts");
const getComingSoonProducts = require("./getComingSoonProducts");
const getProductsByName = require("./getProductsByName");
const getAllProductsName = require("./getAllProductsName");
const getWishListProduct = require("./getWishListProduct");
const monobankWebhook = require("./monobankWebhook");
const updateDescription = require("./updateDescription");
const getFavoriteProduct = require("./getFavoriteProduct");
const checkAvailability = require("./checkAvailability");

module.exports = {
  getProducts,
  addProduct,
  getProductById,
  removeProductById,
  updatePhotoProductById,
  getAllProducts,
  getComingSoonProducts,
  getProductsByName,
  getAllProductsName,
  getWishListProduct,
  monobankWebhook,
  updateDescription,
  getFavoriteProduct,
  checkAvailability
};
