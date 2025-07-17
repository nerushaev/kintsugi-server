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
  // ↓↓↓ добавляем таймауты ↓↓↓
  connectionTimeout: 10_000,  // время на установление TCP-соединения
  greetingTimeout:   5_000,   // время на ответ SMTP-сервера после подключения
  socketTimeout:     10_000,  // общее время на всю операцию

  tls: {
    // на случай, если где-то в цепочке сертификат вызывает DEPTH_ZERO_SELF_SIGNED_CERT
    rejectUnauthorized: false
  }
};

const transport = nodemailer.createTransport(nodemailerConfig);

module.exports = transport;
