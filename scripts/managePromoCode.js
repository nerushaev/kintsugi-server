// Explicit CLI only: no promotion is activated at server startup.
require("dotenv").config();
const mongoose = require("mongoose");
const Promo = require("../models/promoCode");
const { normalizeCode } = require("../services/promoPricing");
(async () => {
  try {
    const [action, input = "KINTSUGI5"] = process.argv.slice(2);
    if (!["prepare", "activate", "disable", "status"].includes(action)) throw new Error("Usage: node scripts/managePromoCode.js prepare|activate|disable|status [CODE]");
    const code = normalizeCode(input);
    if (!code) throw new Error("Code required");
    await mongoose.connect(process.env.DB_HOST);
    await Promo.init();
    if (action === "prepare") await Promo.updateOne({ code }, { $setOnInsert: { code, percent: 5, active: false } }, { upsert: true, runValidators: true });
    if (action === "activate") {
      const startsAt = new Date();
      const result = await Promo.updateOne({ code, startsAt: null, expiresAt: null }, { $set: { active: true, startsAt, expiresAt: new Date(startsAt.getTime() + 21 * 86400000) } }, { runValidators: true });
      if (!result.modifiedCount) throw new Error("Prepare code first; already started campaigns cannot be extended by this command.");
    }
    if (action === "disable") await Promo.updateOne({ code }, { $set: { active: false } });
    console.log(JSON.stringify(await Promo.findOne({ code }).select("code percent active startsAt expiresAt -_id").lean()));
  } catch (error) { console.error(error.name === "MongoServerError" ? "Database operation failed" : error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
