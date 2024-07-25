const { default: axios } = require("axios");

const { MONOBANK_TEST_TOKEN, MONOBANK_CREATE_INVOICE_URL } = process.env;

const monoPay = async ({ amount }) => {
  const config = {
    headers: {
      "X-Token": MONOBANK_TEST_TOKEN,
    },
  };

  console.log('beforeMono');

  const {data} = await axios.post(MONOBANK_CREATE_INVOICE_URL, {
    amount: amount,
    ccy: 980,
    webHookUrl: "https://api.kintsugi.org.ua/api/products/monobankWebhook"
  }, config);

  console.log(data);

  return data;
};

module.exports = monoPay;
