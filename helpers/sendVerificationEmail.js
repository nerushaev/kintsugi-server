const { transport } = require("../middleware");
const { emailButton, emailLayout, mailFrom } = require("./emailTemplates");

const sendVerificationEmail = async (email, verificationToken) => {
  const baseUrl = (process.env.BASE_URL || "https://api.kintsugi.org.ua").replace(/\/$/, "");
  const verificationUrl = `${baseUrl}/api/auth/verify/${verificationToken}`;

  return transport.sendMail({
    from: mailFrom,
    to: email,
    subject: "Підтвердіть email — Kintsugi",
    html: emailLayout({
      eyebrow: "ПІДТВЕРДЖЕННЯ EMAIL",
      title: "Підтвердіть вашу електронну адресу",
      intro: "Натисніть кнопку нижче, щоб підтвердити email вашого облікового запису Kintsugi.",
      content: emailButton("Підтвердити email", verificationUrl),
      note: "Після підтвердження ми додамо до кабінету попередні замовлення, оформлені з цією поштою.",
    }),
  });
};

module.exports = sendVerificationEmail;
