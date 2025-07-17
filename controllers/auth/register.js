const { User } = require("../../models/user");
const bcrypt = require("bcrypt");
const randomId = require("random-id");
const { generateTokens } = require("../../helpers");

const register = async (req, res) => {
  const { email, password, phone } = req.body;

  const duplicateEmail = await User.findOne({ email });
  const duplicatePhone = await User.findOne({ phone });

  if (duplicateEmail) {
    return res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою вже існує!",
    });
  }

  if (duplicatePhone) {
    return res.status(409).json({
      status: 409,
      message: "Користувач із таким номером вже існує!",
    });
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const verificationToken = randomId(36, "aA0");
  const avatarURL =
    "https://res.cloudinary.com/dzjmswzgp/image/upload/v1691783112/Group_26_r3qewe.jpg";

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    verificationToken,
    avatarURL,
    role: "user",
  });

  const { token, refreshToken } = await generateTokens(newUser._id);

  const user = await User.findByIdAndUpdate(newUser._id, {
    token,
    refreshToken,
  });

  res
    .cookie("refreshToken", refreshToken, {
      sameSite: "None",
      httpOnly: true,
      secure: true,
      domain: "",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .cookie("token", token, {
      sameSite: "None",
      httpOnly: true,
      secure: true,
      domain: "",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  res.status(201).json({
    token: token,
    user,
  });
};

module.exports = register;
