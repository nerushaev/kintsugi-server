const { Schema, model } = require("mongoose");
const schema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,40}$/ },
  percent: { type: Number, required: true, min: 1, max: 99, validate: Number.isInteger },
  active: { type: Boolean, default: false },
  startsAt: Date,
  expiresAt: Date,
}, { timestamps: true });
module.exports = model("promoCode", schema);
