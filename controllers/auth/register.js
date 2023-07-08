const { User } = require("../../models/user");
const bcrypt = require("bcrypt");
const RequestError = require("../../helpers/requestError");
const randomId = require("random-id");
const { transport } = require("../../middleware");
const { generateTokens } = require("../../helpers");
const { KINTSUGI_GMAIL, BASE_URL } = process.env;
const gravatar = require("gravatar");

const register = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    throw RequestError(409, "Email in use...");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const verificationToken = randomId(36, "aA0");
  const avatarURL = gravatar.url(email, { s: "233", protocol: "http" });

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    verificationToken,
    avatarURL,
    role: "user",
  });

  const { token, refreshToken } = await generateTokens(newUser._id);

  await User.findByIdAndUpdate(newUser._id, { token, refreshToken });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "None",
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const verifyEmail = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Верифікація пошти Kintsugi Cosplay",
    html: `<p>Давай верифікуємо твою пошту. Натисни тут <a target="_blank" href="${BASE_URL}/api/users/verify/${verificationToken}">link</a> .</p>`,
  };

  await transport.sendMail(verifyEmail);

  res.status(201).json({
    token,
    refreshToken,
    verificationToken,
    user: {
      name: newUser.name,
      email: newUser.email,
      avatar: avatarURL,
    },
  });
};

module.exports = register;
