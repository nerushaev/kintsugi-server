const { User } = require("../../models/user");
const RequestError = require("../../helpers/requestError");
const sendVerificationEmail = require("../../helpers/sendVerificationEmail");

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

  await sendVerificationEmail(email, userVerificationToken);

  res.json({ message: "Лист для підтвердження надіслано" });
};

module.exports = resendVerifyEmail;
