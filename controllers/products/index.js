const getProducts = require("./getProducts");
const addProduct = require("./addProduct");
const getProductById = require("./getProductById");
const removeProductById = require("./deleteProductById");
const updatePhotoProductById = require("./updatePhotoProductById");
const getAllProducts = require("./getAllProducts");
const getComingSoonProducts = require("./getComingSoonProducts");
const getProductsByName = require("./getProductsByName");
const updateSizeProduct = require("./updateSizeProduct");
const getAllProductsName = require("./getAllProductsName");
const getWishListProduct = require("./getWishListProduct");
const monobankWebhook = require("./monobankWebhook");
const updateProductById = require("./updateProductById");

module.exports = {
  getProducts,
  addProduct,
  getProductById,
  removeProductById,
  updatePhotoProductById,
  getAllProducts,
  getComingSoonProducts,
  getProductsByName,
  updateSizeProduct,
  getAllProductsName,
  getWishListProduct,
  monobankWebhook,
  updateProductById
};
