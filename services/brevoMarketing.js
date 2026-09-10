// Marketing campaigns only. This module never uses the store's Gmail transport.
const axios = require("axios");
const createBrevoMarketing = ({ apiKey, senderId, http = axios } = {}) => {
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("Configure BREVO_API_KEY on the server");
  const request = async (method, path, data) => {
    try {
      const response = await http.request({ method, url: `https://api.brevo.com/v3/${path}`,
        headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
        data, timeout: 15000, maxRedirects: 0 });
      return response.data;
    } catch (error) {
      // Axios errors contain credentials in config; never log or propagate them.
      const status = Number(error.response?.status) || null;
      throw Object.assign(new Error(status ? `Brevo request failed (HTTP ${status})` : "Brevo connection failed; outcome may be unknown"), { status });
    }
  };
  return {
    async checkAccount() {
      const [account, result] = await Promise.all([request("GET", "account"), request("GET", "senders")]);
      const sender = result.senders?.find(s => s.id === Number(senderId));
      return { connected: true,
        plans: (account.plan || []).map(p => ({ type: p.type, credits: p.credits ?? null, creditsType: p.creditsType })),
        senderConfigured: !!sender, senderActive: sender?.active === true,
        senderDomain: sender?.email?.split("@")[1] || null,
        domainAuthentication: "Verify in Brevo before launching",
      };
    },
  };
};
module.exports = { createBrevoMarketing };
