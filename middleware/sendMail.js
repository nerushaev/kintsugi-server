const nodemailer = require("nodemailer");
const { KINTSUGI_GMAIL, KINTSUGI_GMAIL_VERIFICATION } = process.env;

const nodemailerConfig = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,

  auth: {
    user: KINTSUGI_GMAIL,
    pass: KINTSUGI_GMAIL_VERIFICATION,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
};

const transport = nodemailer.createTransport(nodemailerConfig);

module.exports = transport;
