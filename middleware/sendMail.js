const nodemailer = require("nodemailer");
const { KINTSUGI_GMAIL, KINTSUGI_GMAIL_VERIFICATION } = process.env;

const nodemailerConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: KINTSUGI_GMAIL,
    pass: KINTSUGI_GMAIL_VERIFICATION,
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);

module.exports = transport;
