require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const { createBrevoMarketing } = require("../services/brevoMarketing");
(async () => {
  try {
    const marketing = createBrevoMarketing({ apiKey: process.env.BREVO_API_KEY, senderId: process.env.BREVO_SENDER_ID });
    console.log(JSON.stringify(await marketing.checkAccount(), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
})();
