const randomId = require("random-id");
const Product = require("../../models/product");
const createWaybill = require("../../middleware/createWaybill");
const Order = require("../../models/order");
const { User } = require("../../models/user");
const { RequestError } = require("../../helpers");
const { formatDate } = require("../../helpers");

const addOrder = async (req, res) => {
  // Проверяем зарегистрирован ли пользователь
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

  const today = new Date();
  const date = formatDate(today, "dd/mm/yy");

  console.log(req.body);

  const deliveryData = {
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
  };

  const data = await createWaybill({ ...req.body, totalPrice });

  if (data) {
    await Order.create({ ...req.body, orderRef: data.data[0].Ref });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $push: {
          orders: {
            products: [...products],
            orderRef: data.data[0].Ref,
            date,
            totalPrice,
          },
        },
      });
    }
  }

  if (!user.delivery) {
    console.log("a");
    await User.findOneAndUpdate(user._id, {
      $set: { delivery: deliveryData },
    });
  }

  if (data.success) {
    res.status(201).json({
      message: "Накладна успішно створена!",
      result: {
        data,
      },
    });
  } else {
    res.status(409).json({
      message: "Щось пішло не так, перевірьте правильність данних!",
    });
  }
};

module.exports = addOrder;
