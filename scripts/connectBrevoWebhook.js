require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const axios = require("axios");
const Credential = require("../models/marketingWebhookCredential");
(async () => {
  try {
    const url = "https://api.kintsugi.org.ua/api/marketing/brevo/webhook";
    const probe = await axios.post(url, {}, { validateStatus: () => true, timeout: 15000 });
    if (probe.status !== 401) throw new Error("Deploy authenticated webhook endpoint first");
    const api = axios.create({ baseURL: "https://api.brevo.com/v3/", headers: { "api-key": process.env.BREVO_API_KEY }, timeout: 15000, maxRedirects: 0 });
    const { data } = await api.get("webhooks", { params: { type: "marketing" } }).catch(error => {
      if ([400, 404].includes(error.response?.status) && error.response?.data?.code === "document_not_found") return { data: { webhooks: [] } };
      throw error;
    });
    const existing = data.webhooks?.find(w => w.url === url);
    const token = crypto.randomBytes(32).toString("hex");
    await mongoose.connect(process.env.DB_HOST);
    await Credential.updateOne({ _id: "brevo" }, { $set: { tokenHash: crypto.createHash("sha256").update(token).digest("hex") } }, { upsert: true });
    const body = { url, description: "Kintsugi marketing unsubscribe sync", events: ["unsubscribed"], type: "marketing", auth: { type: "bearer", token } };
    const result = existing ? await api.put(`webhooks/${existing.id}`, body) : await api.post("webhooks", body);
    // Authenticated no-op verifies routing and credential configuration without changing contacts.
    const check = await axios.post(url, { event: "connection_check" }, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    console.log(JSON.stringify({ webhookId: existing?.id || result.data.id, connected: check.status === 204 }));
  } catch (error) {
    console.error(error.isAxiosError ? `Webhook setup failed: HTTP ${error.response?.status || "unknown outcome"}` : error.message);
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
})();
