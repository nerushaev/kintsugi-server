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

  const streetAddress = warehouseAddress.split(", ");
  console.log("streetAddress", streetAddress);

  try {
    const recipient = await createRecipient(clientData);
    // const street = await getStreetRef(cityRef, streetAddress[0]);

    // console.log(cityRef);
    // const streetRef = await street.data[0].Ref;

    const data = await createWaybill(recipient);
    return data;
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
        CargoType: "Parsel",
        Weight: "1",
        ServiceType: "WarehouseWarehouse",
        SeatsAmount: "1",
        Description: `${resultDescription}`,
        Cost: "300",
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
