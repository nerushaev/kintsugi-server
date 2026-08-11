const { User } = require("../../models/user");
const RequestError = require("../../helpers/requestError");
const { transport } = require("../../middleware");
const { emailButton, emailLayout, mailFrom } = require("../../helpers/emailTemplates");
const { BASE_URL = "https://api.kintsugi.org.ua" } = process.env;

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw RequestError(404, "User is not found");
  }

  if (user.verify) {
    throw RequestError(400, "Verification has already been passed");
  }

  const userVerificationToken = user.verificationToken;

  const verificationUrl = `${BASE_URL.replace(/\/$/, "")}/api/auth/verify/${userVerificationToken}`;
  const verifyEmail = {
    from: mailFrom,
    to: email,
    subject: "Підтвердіть email — Kintsugi",
    html: emailLayout({
      eyebrow: "ПІДТВЕРДЖЕННЯ EMAIL",
      title: "Підтвердіть вашу електронну адресу",
      intro: "Натисніть кнопку нижче, щоб підтвердити email вашого облікового запису Kintsugi.",
      content: emailButton("Підтвердити email", verificationUrl),
      note: "Якщо ви не надсилали цей запит, просто проігноруйте лист.",
    }),
  };

  await transport.sendMail(verifyEmail);

  res.json({ message: "Лист для підтвердження надіслано" });
};

module.exports = resendVerifyEmail;
