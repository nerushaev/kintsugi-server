// Explicit owner-only preview. No customer audiences, scheduling, or sendNow.
require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");
const ownerEmail = "kintsugi.cosplay.store@gmail.com";
(async () => {
  try {
    if (!process.env.BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");
    const api = axios.create({ baseURL: "https://api.brevo.com/v3/", headers: { "api-key": process.env.BREVO_API_KEY }, timeout: 20000, maxRedirects: 0 });
    const [action, id] = process.argv.slice(2);
    if (action === "create") {
      const senderId = Number(process.env.BREVO_SENDER_ID);
      if (!Number.isSafeInteger(senderId) || senderId < 1) throw new Error("Missing sender ID");
      const { data } = await api.post("emailCampaigns", {
        name: "KINTSUGI5 — owner preview — 21 days",
        sender: { id: senderId }, type: "classic",
        subject: "[ТЕСТ] Знайдіть своє в Kintsugi — зі знижкою 5%",
        previewText: "Фігурки, мерч, K-pop, аксесуари, косплей та інше — з промокодом KINTSUGI5.",
        replyTo: ownerEmail,
        htmlContent: fs.readFileSync(path.join(__dirname, "../docs/marketing/kintsugi5-test.html"), "utf8"),
      });
      console.log(JSON.stringify({ draftCampaignId: data.id }));
    } else if ((action === "send-test" || action === "status" || action === "update") && /^\d+$/.test(id || "")) {
      const { data } = await api.get(`emailCampaigns/${id}`);
      if (action === "status") {
        console.log(JSON.stringify({ id: data.id, status: data.status, testSent: data.testSent }));
        return;
      }
      if (data.name !== "KINTSUGI5 — owner preview — 21 days" || data.status !== "draft") throw new Error("Expected owner preview draft");
      if (action === "update") {
        await api.put(`emailCampaigns/${id}`, {
          subject: "[ТЕСТ] Знайдіть своє в Kintsugi — зі знижкою 5%",
          previewText: "Фігурки, мерч, K-pop, аксесуари, косплей та інше — з промокодом KINTSUGI5.",
          htmlContent: fs.readFileSync(path.join(__dirname, "../docs/marketing/kintsugi5-test.html"), "utf8"),
        });
        console.log(JSON.stringify({ updatedDraftId: Number(id) }));
        return;
      }
      await api.post(`emailCampaigns/${id}/sendTest`, { emailTo: [ownerEmail] });
      console.log(JSON.stringify({ testAccepted: true, campaignId: Number(id), recipient: ownerEmail }));
    } else throw new Error("Usage: create | update ID | send-test ID | status ID");
  } catch (error) {
    // Never output Axios config or headers containing the API key. No automatic retries.
    console.error(error.isAxiosError ? `Brevo request failed: ${error.response?.status || "connection; check outcome before retrying"} (${error.response?.data?.code || "unknown"})` : error.message);
    process.exitCode = 1;
  }
})();
