const { Schema, model } = require("mongoose");
module.exports = model("marketingWebhookCredential", new Schema({
  _id: String,
  tokenHash: { type: String, required: true },
}));
