const getProducts = require('./getProducts');
const addProduct = require('./addProduct');
const getProductById = require('./getProductById');
const removeProductById = require('./deleteProductById');
const updateProductById = require('./updateProductById');
const getAllProducts = require('./getAllProducts');
const getComingSoonProducts = require('./getComingSoonProducts');
const getProductsByName = require('./getProductsByName');

module.exports = {
  getProducts,
  addProduct,
  getProductById,
  removeProductById,
  updateProductById,
  getAllProducts,
  getComingSoonProducts,
  getProductsByName
}