const { User } = require("../../models/user");
const bcrypt = require("bcrypt");
const { generateTokens, RequestError } = require("../../helpers");
// const Order = require("../../models/order");

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  console.log(user);

  if (!user) {
    throw RequestError(401);
  }

  const passwordCompare = await bcrypt.compare(password, user.password);

  if (!passwordCompare) {
    throw RequestError(401, "Невірний пароль...");
  }

  const { token, refreshToken } = await generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, { token, refreshToken });


  res
  .cookie("refreshToken", refreshToken, {
    sameSite: "None",
    httpOnly: true,
    secure: true,
    domain: "kintsugi.org.ua",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
    .json({
      token,
      user,
    });
};

module.exports = login;
