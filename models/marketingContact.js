const { Schema, model } = require("mongoose");

// Operational preference only: marketingEnabled is not evidence of consent.
const schema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  marketingEnabled: { type: Boolean, default: true },
  consentStatus: { type: String, enum: ["unknown", "granted"], default: "unknown" },
  unsubscribedAt: { type: Date, default: null },
  consentRecordedAt: Date,
  consentSource: String,
}, { timestamps: true });

module.exports = model("marketingContact", schema);
