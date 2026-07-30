const { RequestError } = require("../../helpers");
const { transport } = require("../../middleware");
const bcrypt = require("bcrypt");
const randomId = require("random-id");
const { User } = require("../../models/user");

const { KINTSUGI_GMAIL } = process.env;

const restorePass = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw RequestError(404, "Email is not found");
  }

  const newPassword = randomId(10);
  const hashPassword = await bcrypt.hash(newPassword, 10);


const newPasswordEmail = {
  from: KINTSUGI_GMAIL,
  to: email,
  subject: "Відновлення пароля — Kintsugi",
  html: `
    <p>Вітаємо!</p>

    <p>Ви запросили відновлення пароля для вашого облікового запису Kintsugi.</p>

    <p>Ваш новий пароль: <strong>${newPassword}</strong></p>

    <p>Використайте його для входу у свій обліковий запис.</p>

    <p>
      Якщо ви не надсилали запит на відновлення пароля,
      рекомендуємо звернутися до нашої підтримки.
    </p>

    <p>З повагою,<br>команда Kintsugi ❤️</p>
  `,
};

await transport.sendMail(newPasswordEmail);
  await User.findByIdAndUpdate(user._id, { password: hashPassword });

res.json({
  message: "Новий пароль надіслано на вашу електронну пошту.",
});
};

module.exports = restorePass;
