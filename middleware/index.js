const ctrlWrapper = require("./ctrlWrapper");
const validation = require("./validation");
const authenticate = require("./authenticate");
const upload = require("./upload");
const createWaybill = require("./createWaybill");
const transport = require("./sendMail");

module.exports = {
  ctrlWrapper,
  validation,
  authenticate,
  upload,
  createWaybill,
  transport,
};
