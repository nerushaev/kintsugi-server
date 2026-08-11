const bcrypt = require("bcrypt");
const randomId = require("random-id");
const { User } = require("../../models/user");
const { generateTokens } = require("../../helpers");
const { getAuthCookieOptions } = require("../../helpers/authCookies");

const register = async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const phone = String(req.body.phone).trim();
  const firstName = String(req.body.firstName).trim();
  const lastName = String(req.body.lastName).trim();
  const { password } = req.body;

  const [duplicateEmail, duplicatePhone] = await Promise.all([
    User.exists({ email }),
    User.exists({ phone }),
  ]);
  if (duplicateEmail || duplicatePhone) {
    return res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою або номером уже існує",
    });
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password: await bcrypt.hash(password, 10),
    verificationToken: randomId(36, "aA0"),
    avatarURL: "https://res.cloudinary.com/dzjmswzgp/image/upload/v1691783112/Group_26_r3qewe.jpg",
    role: "user",
  });

  const { token, refreshToken } = await generateTokens(newUser._id);
  const user = await User.findByIdAndUpdate(newUser._id, { refreshToken }, { new: true });

  res
    .cookie("refreshToken", refreshToken, getAuthCookieOptions(req, 30 * 24 * 60 * 60 * 1000))
    .cookie("token", token, getAuthCookieOptions(req, 12 * 60 * 60 * 1000));

  return res.status(201).json({ token, user });
};

module.exports = register;
