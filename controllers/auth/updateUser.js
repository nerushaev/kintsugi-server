const { failure, success } = require("../../helpers/response");
const { User } = require("../../models/user");

const updateUser = async (req, res) => {
  try {
    const { _id } = req.user;
    const { firstName, lastName, email, phone } = req.body;

    const duplicateEmail = await User.findOne({ email, _id: { $ne: _id } });
    const duplicatePhone = await User.findOne({ phone, _id: { $ne: _id } });
    

    if (duplicateEmail) {
      return failure(
        res,
        "Користувач із такою поштою вже існує!",
        409,
        "DUPLICATE_EMAIL"
      );
    }

    if (duplicatePhone) {
      return failure(
        res,
        "Користувач із таким номером вже існує!",
        409,
        "DUPLICATE_PHONE"
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      _id,
      {
        firstName,
        lastName,
        email,
        phone,
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return failure(res, "Користувача не знайдено", 404, "USER_NOT_FOUND");
    }
    return success(res, updatedUser, "Дані успішно оновлено!");
  } catch (error) {
    return failure(
      res,
      "Помилка оновлення даних користувача",
      500,
      error.message || error
    );
  }
};

module.exports = updateUser;
