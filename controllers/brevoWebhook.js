const crypto = require("node:crypto");
const Joi = require("joi");
const Contact = require("../models/marketingContact");
const Credential = require("../models/marketingWebhookCredential");
const emailSchema = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required();
module.exports = async (req, res) => {
  try {
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.get("authorization") || "")?.[1];
    if (!token) return res.sendStatus(401);
    const credential = await Credential.findById("brevo").lean();
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    if (!credential || !/^[a-f0-9]{64}$/.test(credential.tokenHash) ||
        !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(credential.tokenHash))) return res.sendStatus(401);
    const events = Array.isArray(req.body) ? req.body : [req.body];
    if (!events.length || events.length > 100) return res.sendStatus(400);
    for (const event of events) {
      if (!["unsubscribe", "unsubscribed"].includes(event?.event)) continue;
      const { value: email, error } = emailSchema.validate(event.email);
      if (error) return res.sendStatus(400);
      await Contact.updateOne({ email }, {
        $set: { marketingEnabled: false, unsubscribedAt: new Date() },
        $setOnInsert: { email, consentStatus: "unknown" },
      }, { upsert: true });
    }
    return res.sendStatus(204);
  } catch {
    // Return a retryable status without logging contact data or credentials.
    return res.sendStatus(503);
  }
};
