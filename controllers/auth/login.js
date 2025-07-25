const { User } = require("../../models/user");
const bcrypt = require("bcrypt");
const { generateTokens, RequestError } = require("../../helpers");
const { success, failure } = require("../../helpers/response");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return failure(
        res,
        "Такого користувача не існує, перевірьте правильність вказаної пошти!",
        404,
        "USER_NOT_FOUND"
      );
    }

    const passwordCompare = await bcrypt.compare(password, user.password);

    if (!passwordCompare) {
      return failure(res, "Невірний пароль!", 401, "WRONG_PASSWORD");
    }

    const { token, refreshToken } = await generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { token, refreshToken });
    console.log("token", token);
    console.log("refreshToken", refreshToken);
    res
      .cookie("refreshToken", refreshToken, {
        sameSite: "None",
        httpOnly: true,
        secure: true,
        domain: ".kintsugi.org.ua",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .cookie("token", token, {
        sameSite: "None",
        httpOnly: true,
        secure: true,
        domain: ".kintsugi.org.ua",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    return success(res, { token, user }, "Авторизація успішна!");
  } catch (error) {
    console.error("Login error:", error);
    return failure(res, "Помилка авторизації", 500, error.message || error);
  }
};

module.exports = login;
