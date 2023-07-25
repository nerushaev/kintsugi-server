const register = require("./register");
const login = require("./login");
const logout = require("./logout");
const getCurrent = require("./getCurrent");
const refresh = require("./refresh");
const updateUser = require("./updateUser");
const restorePass = require("./restorePass");
const changePassword = require("./changePassword");
const resendVerifyEmail = require("./resendVerifyEmail");
const verify = require("./verify");

module.exports = {
  register,
  login,
  logout,
  getCurrent,
  refresh,
  updateUser,
  restorePass,
  changePassword,
  resendVerifyEmail,
  verify,
};
