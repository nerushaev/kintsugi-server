const { success, failure } = require("../../helpers/response");
const Product = require("../../models/product");

const updateDescription = async (req, res) => {
  console.log("Запрос достиг контроллера");
  const { product_id } = req.params;
  const { description } = req.body;
  console.log("product_id", product_id);
  console.log("description", description);
  try {
    await Product.findOneAndUpdate(
      { product_id: product_id },
      { description: description },
      { new: true }
    );
    return success(res,  description, "Опис успішно змінено!");
  } catch (error) {
    return failure(res, error.message, 500, error);
  }
};

module.exports = updateDescription;
