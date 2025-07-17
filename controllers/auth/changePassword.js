const { RequestError } = require("../../helpers");
const bcrypt = require("bcrypt");
const { User } = require("../../models/user");
const { failure, success } = require("../../helpers/response");

const changePassword = async (req, res) => {
  try {
    const { user } = req;
    const { oldPass, newPass } = req.body;
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
    return success(res, updateUserPass, "Пароль успішно змінено!", "PASS_CHANGED");
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
