const { transport } = require("../../middleware");
const bcrypt = require("bcrypt");
const randomId = require("random-id");
const { User } = require("../../models/user");
const { emailDetails, emailLayout, mailFrom } = require("../../helpers/emailTemplates");

const restorePass = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  const responseMessage = "Якщо обліковий запис із такою поштою існує, новий пароль буде надіслано на неї.";
  if (!user) return res.json({ message: responseMessage });

  const newPassword = randomId(10);
  const hashPassword = await bcrypt.hash(newPassword, 10);


const newPasswordEmail = {
  from: mailFrom,
  to: email,
  subject: "Відновлення пароля — Kintsugi",
  html: emailLayout({
    eyebrow: "БЕЗПЕКА",
    title: "Пароль відновлено",
    intro: "Для вашого облікового запису створено тимчасовий пароль.",
    content: `${emailDetails([["Тимчасовий пароль", newPassword]])}<p>Увійдіть із цим паролем і одразу змініть його в розділі «Безпека» особистого кабінету.</p>`,
    note: "Якщо ви не надсилали цей запит, зверніться до підтримки Kintsugi.",
  }),
};

await transport.sendMail(newPasswordEmail);
  await User.findByIdAndUpdate(user._id, { password: hashPassword });

res.json({
  message: responseMessage,
});
};

module.exports = restorePass;
