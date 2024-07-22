const register = require("./register");
const login = require("./login");
const logout = require("./logout");
const getCurrent = require("./getCurrent");
const refresh = require("./refresh");
const updateUserDelivery = require("./updateUserDelivery");
const restorePass = require("./restorePass");
const changePassword = require("./changePassword");
const resendVerifyEmail = require("./resendVerifyEmail");
const verify = require("./verify");
const updateUser = require("./updateUser");
const addToWishList = require('./addToWishList');
const removeFromWish = require('./removeFromWish');
module.exports = {
  register,
  login,
  logout,
  getCurrent,
  refresh,
  updateUserDelivery,
  restorePass,
  changePassword,
  resendVerifyEmail,
  verify,
  updateUser,
  addToWishList,
  removeFromWish
};
