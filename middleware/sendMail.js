const nodemailer = require('nodemailer');
const { KINTSUGI_GMAIL_PASSWORD } = process.env;

const nodemailerConfig = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'kintsugi.cosplay.store@gmail.com',
    pass: 'avkxixqoajwwdcdn',
  }
};

export const transport = nodemailer.createTransport(nodemailerConfig);

const email = {
  to: 'kolyanerushaev@gmail.com',
  from: 'kintsugi.cosplay.store@gmail.com',
  subject: 'Нове замовлення!',
  html: '<p>Перука</p>',
};

