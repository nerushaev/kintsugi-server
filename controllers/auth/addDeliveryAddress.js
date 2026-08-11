const { User } = require("../../models/user");
const { success, failure } = require("../../helpers/response");

const deliveryFields = {
  branch: ["warehouse", "warehouseRef"],
  postbox: ["postbox", "warehouseRef"],
  address: ["address", "house", "streetRef"],
};

const addDeliveryAddress = async (req, res) => {
  try {
    const { _id } = req.user;
    const { deliveryType, city } = req.body;
    const requiredFields = deliveryFields[deliveryType];

    if (
      !requiredFields ||
      typeof city !== "string" ||
      !city.trim() ||
      !String(req.body.cityRef || "").trim()
    ) {
      return failure(res, "Перевірте місто та спосіб доставки", 400, "INVALID_ADDRESS");
    }
    if (requiredFields.some((field) => !String(req.body[field] || "").trim())) {
      return failure(res, "Заповніть обов'язкові поля адреси", 400, "INCOMPLETE_ADDRESS");
    }

    const address = {
      deliveryType,
      city: city.trim(),
      warehouse: deliveryType === "branch" ? String(req.body.warehouse).trim() : "",
      postbox: deliveryType === "postbox" ? String(req.body.postbox).trim() : "",
      address: deliveryType === "address" ? String(req.body.address).trim() : "",
      house: deliveryType === "address" ? String(req.body.house).trim() : "",
      apartment: deliveryType === "address" ? String(req.body.apartment).trim() : "",
      cityRef: String(req.body.cityRef || "").trim(),
      settlementRef: String(req.body.settlementRef || "").trim(),
      warehouseRef: String(req.body.warehouseRef || "").trim(),
      warehouseIndex: String(req.body.warehouseIndex || "").trim(),
      streetRef: String(req.body.streetRef || "").trim(),
    };

    const result = await User.findByIdAndUpdate(
      _id,
      { $push: { addresses: address } },
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
