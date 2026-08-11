const axios = require("axios");

const {
  MONOBANK_TOKEN,
  MONOBANK_CREATE_INVOICE_URL,
  MONOBANK_WEBHOOK_URL = "https://api.kintsugi.org.ua/api/products/monobankWebhook",
  MONOBANK_REDIRECT_URL = "https://kintsugi.org.ua/",
} = process.env;

const monoPay = async ({ amount, orderId }) => {
  if (!MONOBANK_TOKEN || !MONOBANK_CREATE_INVOICE_URL) {
    throw new Error("Monobank is not configured");
  }
  if (!Number.isInteger(amount) || amount <= 0 || !orderId) {
    throw new Error("Invalid Monobank invoice data");
  }

  const { data } = await axios.post(
    MONOBANK_CREATE_INVOICE_URL,
    {
      amount,
      ccy: 980,
      webHookUrl: MONOBANK_WEBHOOK_URL,
      redirectUrl: MONOBANK_REDIRECT_URL,
      merchantPaymInfo: {
        reference: orderId,
        destination: `Оплата замовлення ${orderId}`,
      },
    },
    {
      headers: { "X-Token": MONOBANK_TOKEN },
      timeout: 15000,
    }
  );

  if (!data?.invoiceId || !data?.pageUrl) {
    throw new Error("Monobank returned an invalid invoice");
  }

  return data;
};

module.exports = monoPay;
