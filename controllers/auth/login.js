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
    throw RequestError(401, "Password invalid...");
  }

  const { token, refreshToken } = await generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, { token, refreshToken });


  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "None",
      domain: "https://kintsugi.org.ua/login",
    })
    .json({
      token,
      user,
    });
};

module.exports = login;

// const bcrypt = require("bcrypt");

// const User = require("../../models/user");
// const RequestError = require("../../helpers/requestError");
// const { generateTokens } = require("../../helpers/generateTokens");

// const login = async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email });

//   if (!user) {
//     throw RequestError(401, "Email or password is wrong");
//   }

//   const comparePassword = await bcrypt.compare(password, user.password);

//   if (!comparePassword) {
//     throw RequestError(401, "Email or password is wrong");
//   }

//   const { token, refreshToken } = await generateTokens(user._id);

//   await User.findByIdAndUpdate(user._id, { token, refreshToken });

//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     maxAge: 30 * 24 * 60 * 60 * 1000,
//   });

//   res.json({
//     token,
//     user: {
//       name: user.name,
//       email: user.email,
//     },
//   });
// };

// module.exports = login;
