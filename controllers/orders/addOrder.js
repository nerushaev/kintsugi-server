const Order = require("../../models/order");
const randomId = require("random-id");
const Product = require("../../models/product");
const createWaybill = require("../../middleware/createWaybill");

const addOrder = async (req, res) => {
  // Проверяем зарегистрирован ли пользователь

  try {
    const orderId = randomId(8, "aA0");
    const { products } = req.body;
    let arrayId = [];
    products.map((item) => {
      arrayId.push(item._id);
    });

    const items = await Product.find({ _id: { $in: arrayId } });

    const result = items.filter((item) => {
      const _id = item._id.toString();
      const result = products.find((elem) => {
        if (elem._id === _id) {
          const isNotHaveAmount = item.amount <= elem.amount;
          return isNotHaveAmount;
        }
      });
      return result;
    });

    let errors = {};

    if (result) {
      errors = result.map((item) => {
        return {
          [item._id]: `Нажаль ${item.name} залишилось ${item.amount}`,
        };
      });
    }

    if (errors) {
      res.status(400).json({
        errors,
      });
    } else {
      const { data } = await createWaybill(req.body);
      return data;
    }
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = addOrder;
