const jwt = require("jsonwebtoken");
const { generateTokens, RequestError } = require("../../helpers");
const { User } = require("../../models/user");

const { REFRESH_SECRET_KEY } = process.env;

const refresh = async (req, res) => {
  console.log(req.cockies);
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw RequestError(401, "Not authorized");
  }

  const { id } = jwt.verify(refreshToken, REFRESH_SECRET_KEY);
  const data = await User.findOne({ _id: id, refreshToken });

  if (!data) {
    throw RequestError(401, "Not authorized refresh");
  }

  const tokens = await generateTokens(data._id);

  await User.findByIdAndUpdate(data._id, {
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  });

  res
  .cookie("refreshToken", refreshToken, {
    sameSite: "None",
    httpOnly: true,
    secure: true,
    domain: "kintsugi.org.ua",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })

  res.json({
    token: tokens.token,
    user: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
    },
  });
};

module.exports = refresh;
