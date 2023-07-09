const { User } = require("../../models/user");
const createHttpError = require("http-errors");
const bcrypt = require("bcrypt");
const { generateTokens } = require("../../helpers");

const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(req.cockies);

  const user = await User.findOne({ email });

  if (!email) {
    throw createHttpError(401, "Email invalid...");
  }

  const passwordCompare = bcrypt.compare(password, user.password);

  if (!passwordCompare) {
    throw createHttpError(401, "Password invalid...");
  }

  const { token, refreshToken } = await generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, { token, refreshToken });
  console.log(user);
  const { name } = user;

  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json({
      token,
      user: {
        email,
        name,
      },
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
