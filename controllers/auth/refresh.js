const jwt = require("jsonwebtoken");
const { generateTokens, RequestError } = require("../../helpers");
const { User } = require("../../models/user");

const { REFRESH_SECRET_KEY } = process.env;

const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw RequestError(401, "Not authorized");
  }

  const { id } = jwt.verify(refreshToken, REFRESH_SECRET_KEY);
  const data = await User.findOne({ _id: id, refreshToken });

  if (!data) {
    return next(createHttpError(401));
  }

  const tokens = await generateTokens(data._id);

  const user = await User.findByIdAndUpdate(data._id, {
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  });

res.cookie("refreshToken", tokens.refreshToken, {
  sameSite: "None",
  httpOnly: true,
  secure: true,
  domain: ".kintsugi.org.ua",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

res.cookie("token", tokens.token, {
  sameSite: "None",
  httpOnly: true,
  secure: true,
  domain: ".kintsugi.org.ua",
  maxAge: 15 * 60 * 1000, // например, 15 минут для access token
});

  

  res.json({
    token: tokens.token,
    user: user,
  });
};

module.exports = refresh;
