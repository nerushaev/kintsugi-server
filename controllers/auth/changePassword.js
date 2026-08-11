const bcrypt = require("bcrypt");
const { User } = require("../../models/user");
const { failure, success } = require("../../helpers/response");

const changePassword = async (req, res) => {
  try {
    const { oldPass, newPass } = req.body;
    if (typeof oldPass !== "string" || typeof newPass !== "string") {
      return failure(res, "Заповніть обидва поля пароля", 400, "INVALID_PASSWORD_DATA");
    }
    if (newPass.length < 7 || newPass.length > 72) {
      return failure(res, "Новий пароль має містити від 7 до 72 символів", 400, "INVALID_PASSWORD_LENGTH");
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return failure(res, "Користувача не знайдено", 404, "USER_NOT_FOUND");
    }

    const passwordCompare = await bcrypt.compare(oldPass, user.password);
    if (!passwordCompare) {
      return failure(res, "Невірний пароль!");
    }
    if(oldPass === newPass) {
      return failure(res, "Новий пароль повинен відрізнятися!");

    }


    const hashPass = await bcrypt.hash(newPass, 10);
    const updateUserPass = await User.findByIdAndUpdate(user._id, {
      password: hashPass,
    });
    if (!updateUserPass) {
      return failure(res, "Користувача не знайдено", 404, "USER_NOT_FOUND");
    }
    return success(res, null, "Пароль успішно змінено!");
  } catch (error) {
    return failure(
      res,
      "Помилка оновлення даних користувача",
      500,
      error.message || error
    );
  }
};

module.exports = changePassword;
