const jwt = require("jsonwebtoken");
const { User } = require("../../models/user");
const { getAuthCookieOptions } = require("../../helpers/authCookies");

const { REFRESH_SECRET_KEY } = process.env;

const logout = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      const { id } = jwt.verify(refreshToken, REFRESH_SECRET_KEY);
      await User.findOneAndUpdate(
        { _id: id, refreshToken },
        { $set: { refreshToken: "" } }
      );
    } catch {
      // Stale cookies still need to be cleared from the browser.
    }
  }

  res.clearCookie("refreshToken", getAuthCookieOptions(req));
  res.clearCookie("token", getAuthCookieOptions(req));
  return res.status(200).json({ message: "Logout success!" });
};

module.exports = logout;
