require("dotenv").config();
const {
  NOVA_API_KEY,
  NOVA_IDENTIFICATOR_KEY,
  NOVA_COUNTERPARTY_REF,
  NOVA_CONTACT_PERSON_REF,
  NOVA_SENDER_ADDRESS_REF,
} = process.env;
const axios = require("axios");
const { getStreetRef, createRecipient } = require("../helpers");

const createWaybill = async (clientData) => {
  const {
    recipientWarehouseIndex,
    products,
    cityRef,
    warehouseAddress,
    warehouseRef,
    phone,
  } = clientData;

  var options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timezone: "UTC",
  };

  const dataNow = new Date().toLocaleString("ua", options);

  const streetAddress = warehouseAddress.split(", ");

  try {
    const recipient = await createRecipient(clientData);
    const street = await getStreetRef(cityRef, streetAddress[1]);
    console.log(street);
    const streetRef = await street.data[0].Ref;

    return await createWaybill(recipient, streetRef);
  } catch (error) {
    console.log(error);
  }

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
        Description: `${products[0].name}`,
        Cost: "300",
        CitySender: "db5c88d0-391c-11dd-90d9-001a92567626",
        Sender: "fa8a6f92-e682-11e7-becf-005056881c6b",
        SenderAddress: NOVA_SENDER_ADDRESS_REF,
        ContactSender: NOVA_CONTACT_PERSON_REF,
        SendersPhone: "380990018005",
        CityRecipient: cityRef,
        Recipient: recipient[0],
        RecipientAddress: warehouseRef,
        ContactRecipient: recipient[1],
        RecipientsPhone: phone,
      },
    });
    console.log("Waybill", data);
  }
};

module.exports = createWaybill;
