const randomId = require("random-id");
const Product = require("../../models/product");
const Order = require("../../models/order");
const { User } = require("../../models/user");
// const { RequestError } = require("../../helpers");
const moment = require("moment");

const addOrder = async (req, res) => {
  const {
    email,
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
  } = req.body;

  const user = await User.findOne({ email });
  // Создаём из массива обьектов массив айди
  const orderId = randomId(8, "aA0");
  const { products } = req.body;
  let arrayId = [];
  let totalPrice = 0;

  products.map((item) => {
    arrayId.push(item._id);
    totalPrice = totalPrice + Math.floor(item.price);
  });

  const items = await Product.find({ _id: { $in: arrayId } });

  const result = items.filter((item) => {
    const _id = item._id.toString();
    const result = products.find((elem) => {
      if (elem._id === _id) {
        const isNotHaveAmount = item.amount < elem.amount;
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

  if (errors?.length) {
    res.status(400).json({
      errors,
    });
  }

  const dateDMY = moment().format("l");
  const dateHM = moment().format("LT");
  const date = dateDMY + `${"|"}` + dateHM;

  const deliveryData = {
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
  };

  await Order.create({
    ...req.body,
    orderId,
    totalPrice,
    date,
    email: user.email,
  });

  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        orders: {
          products: [...products],
          date,
          totalPrice,
        },
      },
    });
  }

  if (user && !user.delivery) {
    await User.findOneAndUpdate(user._id, {
      $set: { delivery: deliveryData },
    });
  }

  res.status(201).json({
    message: "Замовлення прийнято!",
  });
};

module.exports = addOrder;
