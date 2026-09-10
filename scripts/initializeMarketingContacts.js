require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Joi = require("joi");
const Contact = require("../models/marketingContact");

// Explicit migration, never called at startup. Does not send or import to Brevo.
// Existing exclusions survive repeated runs, including source-record exclusions.
(async () => {
  try {
    if (!process.argv.includes("--apply")) throw new Error("Use --apply to initialize marketing preferences");
    await mongoose.connect(process.env.DB_HOST);
    const contacts = new Map();
    const emailSchema = Joi.string().email({ tlds: { allow: false } });
    for (const name of ["users", "orders", "feedbacks"]) {
      const rows = mongoose.connection.db.collection(name).find(
        { email: { $type: "string" } },
        { projection: { email: 1, marketingEnabled: 1, unsubscribedAt: 1 } }
      );
      for await (const row of rows) {
        const email = row.email.trim().toLowerCase();
        if (emailSchema.validate(email).error) continue;
        const excluded = row.marketingEnabled === false || !!row.unsubscribedAt;
        contacts.set(email, contacts.get(email) === true || excluded);
      }
    }
    await Contact.init();
    for (const [email, excluded] of contacts) {
      await Contact.updateOne({ email }, {
        $setOnInsert: { email, consentStatus: "unknown" },
      }, { upsert: true, setDefaultsOnInsert: false });
      if (excluded) {
        await Contact.updateOne({ email }, { $set: { marketingEnabled: false } });
      } else {
        await Contact.updateOne({ email, marketingEnabled: { $exists: false }, unsubscribedAt: null },
          { $set: { marketingEnabled: true } });
      }
    }
    console.log(JSON.stringify({
      sourceUnique: contacts.size,
      total: await Contact.countDocuments(),
      enabled: await Contact.countDocuments({ marketingEnabled: true }),
      disabled: await Contact.countDocuments({ marketingEnabled: false }),
    }));
  } catch (error) {
    console.error(error.message === "Use --apply to initialize marketing preferences" ? error.message : "Marketing initialization failed; existing exclusions were not reset");
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
})();
