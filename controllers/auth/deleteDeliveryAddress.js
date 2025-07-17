// Обновите путь к модели User

const { failure, success } = require("../../helpers/response");
const { User } = require("../../models/user");

const deleteDeliveryAddress = async (req, res) => {
  const { addressId } = req.params;
  const userId = req.user._id;
  console.log(addressId);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!updatedUser) {
      return failure(res, "Користувач не знайдений!", 404, "USER_NOT_FOUND");
    }

    return success(
      res,
      updatedUser.addresses,
      "Адресса успішно видалена!"
    );
  } catch (error) {
    return failure(res, "Помилка сервера!", 500, "SERVER_ERROR");
  }
};

module.exports = deleteDeliveryAddress;
