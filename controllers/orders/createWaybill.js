require("dotenv").config();
const {
  NOVA_API_KEY,
  NOVA_IDENTIFICATOR_KEY,
  NOVA_COUNTERPARTY_REF,
  NOVA_CONTACT_PERSON_REF,
  NOVA_SENDER_ADDRESS_REF,
} = process.env;
const axios = require("axios");
const { getStreetRef, createRecipient } = require("../../helpers");
const Order = require("../../models/order");

const createWaybill = async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.find({ orderId });

  const { recipientWarehouseIndex, products, cityRef, phone, totalPrice, _id } =
    order[0];

  const resultDescription = products.map((item) => {
    return item.name;
  });
  resultDescription.join(",");

  var options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timezone: "UTC",
  };

  const dataNow = new Date().toLocaleString("ua", options);

  const recipient = await createRecipient(order[0]);
  const data = await createWaybill(recipient);
  console.log(data);
  if (data) {
    await Order.findByIdAndUpdate({_id}, {$set: {orderRef: data.data[0].IntDocNumber}});
    await Order.findByIdAndUpdate({_id}, {accepted: true});
  }

  res.status(201).json({
    message: "Накладна успішно створена!",
  });

  async function createWaybill(recipient) {
    const { data } = await axios.post("https://api.novaposhta.ua/v2.0/json/", {
      apiKey: NOVA_API_KEY,
      modelName: "InternetDocument",
      calledMethod: "save",
      methodProperties: {
        SenderWarehouseIndex: "55/47",
        RecipientWarehouseIndex: recipientWarehouseIndex,
        PayerType: "Recipient",
        PaymentMethod: "Cash",
        DateTime: dataNow,
        CargoType: "Cargo",
        Weight: "1",
        ServiceType: "WarehouseWarehouse",
        SeatsAmount: "1",
        Description: `${resultDescription}`,
        Cost: `${totalPrice}`,
        CitySender: "db5c88d0-391c-11dd-90d9-001a92567626",
        Sender: "fa8a6f92-e682-11e7-becf-005056881c6b",
        SenderAddress: NOVA_SENDER_ADDRESS_REF,
        ContactSender: NOVA_CONTACT_PERSON_REF,
        SendersPhone: "380990018005",
        CityRecipient: cityRef,
        Recipient: recipient[0],
        RecipientAddress: "",
        ContactRecipient: recipient[1],
        RecipientsPhone: phone,
      },
    });
    return data;
  }
};

module.exports = createWaybill;
