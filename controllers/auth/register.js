const { User } = require("../../models/user");
const bcrypt = require("bcrypt");
// const RequestError = require("../../helpers/requestError");
const randomId = require("random-id");
const { transport } = require("../../middleware");
const { generateTokens } = require("../../helpers");
const { KINTSUGI_GMAIL, BASE_BACK_END_URL } = process.env;
const gravatar = require("gravatar");

const register = async (req, res) => {
  const { email, password, phone } = req.body;

  const duplicateEmail = await User.findOne({ email });
  const duplicatePhone = await User.findOne({ phone });

  if (duplicateEmail) {
    res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою вже існує!",
    });
  }

  if (duplicatePhone) {
    res.status(409).json({
      status: 409,
      message: "Користувач із таким номером вже існує!",
    });
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

  const verifyEmail = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Верифікація пошти Kintsugi Cosplay",
    html: `<p>Давай верифікуємо твою пошту. Натисни тут <a target="_blank" href="${BASE_BACK_END_URL}/api/auth/verify/${verificationToken}">link</a> .</p>`,
  };

  await transport.sendMail(verifyEmail);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "None",
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    status: 201,
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
