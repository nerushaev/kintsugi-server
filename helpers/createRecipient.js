require("dotenv").config();
const { NOVA_API_KEY, NOVA_BASE_URL } = process.env;
const axios = require("axios");

const createRecipient = async ({ name, phone, email }) => {
  console.log(name, phone, email);
  const userName = name.split(" ");
  const { data } = await axios.post(NOVA_BASE_URL, {
    apiKey: NOVA_API_KEY,
    modelName: "Counterparty",
    calledMethod: "save",
    methodProperties: {
      FirstName: userName[1],
      MiddleName: userName[2],
      LastName: userName[0],
      Phone: phone,
      Email: email,
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
    },
  });
  return [data.data[0].Ref, data.data[0].ContactPerson.data[0].Ref];
};
module.exports = createRecipient;
