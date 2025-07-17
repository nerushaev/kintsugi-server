const { User } = require("../../models/user");
const { success, failure } = require("../../helpers/response");

const addDeliveryAddress = async (req, res) => {
  console.log(req)
  try {
    const { _id } = req.user;

    const result = await User.findByIdAndUpdate(
      _id,
      { $push: { addresses: req.body } },
      { new: true }
    );

    if (!result) {
      return failure(res, "Користувача не знайдено", 404, "USER_NOT_FOUND");
    }

    const newAddress = result.addresses[result.addresses.length - 1];

    return success(res, newAddress, "Адресу успішно додано!");
  } catch (error) {
    console.error("Add delivery address error:", error);
    return failure(
      res,
      "Помилка при додаванні адреси",
      500,
      error.message || error
    );
  }
};

module.exports = addDeliveryAddress;
