const randomId = require("random-id");
const Product = require("../../models/product");
const Order = require("../../models/order");
const { User } = require("../../models/user");
// const { RequestError } = require("../../helpers");
const moment = require("moment");
const {PRIVATE_LIQPAY_KEY} = process.env;
const RandExp = require('randexp');
const crypto = require('crypto');
const { default: axios } = require("axios");

const addOrder = async (req, res) => {
  const {
    email,
    city,
    cityRef,
    warehouse,
    warehouseAddress,
    recipientWarehouseIndex,
    warehouseRef,
    liqpay,
    cash,
  } = req.body;

  const user = await User.findOne({ email });
  // Создаём из массива обьектов массив айди
  const orderId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
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

  console.log(liqpay);

  // if(liqpay) {

  //   // const items = products.map((item) => {

  //   //   return {

  //   //   }
  //   // });

  //   const dataObj = {
  //     version: 3,
  //     public_key: "sandbox_i41941011705",
  //     private_key: PRIVATE_LIQPAY_KEY,
  //     action: "pay",
  //     amount: totalPrice,
  //     currency: "UAH",
  //     description: "Придбання товару",
  //     order_id: orderId,
  //   }

  //   const jsonStr = JSON.stringify(dataObj); 
  //   const buff = new Buffer.from(jsonStr, 'utf-8');
  //   const data = buff.toString('base64');
    
  //   const sign_string = PRIVATE_LIQPAY_KEY + data + PRIVATE_LIQPAY_KEY;
  //   const sha1Hash = crypto.createHash('sha1').update(sign_string, 'utf-8').digest();
  //   const signature = sha1Hash.toString('base64');

  //   const result = await axios.post("https://www.liqpay.ua/api/request", (`&data=${data}&signature=${signature}`));
  //   console.log(result);
  //   console.log(data);
  //   console.log(signature);

    
  // }

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
