const jwt = require("jsonwebtoken");
const { generateTokens, RequestError } = require("../../helpers");
const { User } = require("../../models/user");
const { getAuthCookieOptions } = require("../../helpers/authCookies");

const { REFRESH_SECRET_KEY } = process.env;

const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw RequestError(401, "Not authorized");
  }

  let id;
  try {
    ({ id } = jwt.verify(refreshToken, REFRESH_SECRET_KEY));
  } catch {
    throw RequestError(401, "Not authorized");
  }

  const currentUser = await User.findOne({ _id: id, refreshToken });

  if (!currentUser) {
    throw RequestError(401, "Not authorized");
  }

  const tokens = await generateTokens(currentUser._id);
  const user = await User.findByIdAndUpdate(
    currentUser._id,
    { refreshToken: tokens.refreshToken },
    { new: true }
  );

  res
    .cookie(
      "refreshToken",
      tokens.refreshToken,
      getAuthCookieOptions(req, 30 * 24 * 60 * 60 * 1000)
    )
    .cookie(
      "token",
      tokens.token,
      getAuthCookieOptions(req, 12 * 60 * 60 * 1000)
    )
    .json({ token: tokens.token, user });
};

module.exports = refresh;
