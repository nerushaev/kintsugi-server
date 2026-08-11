const bcrypt = require("bcrypt");
const { User } = require("../../models/user");
const { generateTokens } = require("../../helpers");
const { success, failure } = require("../../helpers/response");
const { getAuthCookieOptions } = require("../../helpers/authCookies");

const login = async (req, res) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return failure(res, "Невірна пошта або пароль", 401, "INVALID_CREDENTIALS");
    }

    const { token, refreshToken } = await generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res
      .cookie("refreshToken", refreshToken, getAuthCookieOptions(req, 30 * 24 * 60 * 60 * 1000))
      .cookie("token", token, getAuthCookieOptions(req, 12 * 60 * 60 * 1000));

    const safeUser = await User.findById(user._id);
    return success(res, { token, user: safeUser }, "Авторизація успішна!");
  } catch (error) {
    console.error("Login error:", error.message);
    return failure(res, "Помилка авторизації", 500, "LOGIN_FAILED");
  }
};

module.exports = login;
