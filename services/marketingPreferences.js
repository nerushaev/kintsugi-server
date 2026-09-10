const Contact = require("../models/marketingContact");
async function recordRegistration(email, optedIn) {
  email = email.trim().toLowerCase();
  await Contact.updateOne({ email }, { $setOnInsert: {
    email, marketingEnabled: optedIn === true, consentStatus: "unknown",
  } }, { upsert: true });
  if (optedIn === true) {
    // Never reactivate an earlier exclusion through an unverified registration.
    await Contact.updateOne({ email, marketingEnabled: true, unsubscribedAt: null }, {
      $set: { consentStatus: "granted", consentRecordedAt: new Date(), consentSource: "registration-checkbox-v1" },
    });
  } else {
    await Contact.updateOne({ email }, { $set: { marketingEnabled: false } });
  }
}
module.exports = { recordRegistration };
