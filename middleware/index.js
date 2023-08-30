const ctrlWrapper = require("./ctrlWrapper");
const validation = require("./validation");
const authenticate = require("./authenticate");
const upload = require("./upload");
const transport = require("./sendMail");

module.exports = {
  ctrlWrapper,
  validation,
  authenticate,
  upload,
  transport,
};
