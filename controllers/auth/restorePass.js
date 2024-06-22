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

  await User.findByIdAndUpdate(user._id, { password: hashPassword });

  const newPasswordEmail = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Restore password Kintsugi",
    html: `<p>Your password has been changed. Your new password: ${newPassword}. Please return to the Petly site page and log in again.</p>`,
  };

  await transport.sendMail(newPasswordEmail);

  res.json({ message: "Новий пароль надіслано..." });
};

module.exports = restorePass;
