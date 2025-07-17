const { default: axios } = require("axios");

const { MONOBANK_TOKEN, MONOBANK_TEST_TOKEN, MONOBANK_CREATE_INVOICE_URL } =
  process.env;

const monoPay = async ({ amount }) => {
  const config = {
    headers: {
      "X-Token": MONOBANK_TOKEN,
      // "X-Token": MONOBANK_TEST_TOKEN,
    },
  };

  console.log("beforeMono");

  const { data } = await axios.post(
    MONOBANK_CREATE_INVOICE_URL,
    {
      amount: amount,
      ccy: 980,
      webHookUrl: "https://api.kintsugi.org.ua/api/products/monobankWebhook",
      redirectUrl: "https://kintsugi.org.ua/",
    },
    config
  );

  return data;
};

module.exports = monoPay;
