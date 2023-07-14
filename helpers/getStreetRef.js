const axios = require("axios");
require("dotenv").config();
const { NOVA_BASE_URL, NOVA_API_KEY } = process.env;

const getStreetRef = async (cityRef, cityName) => {
  try {
    const { data } = await axios.post(NOVA_BASE_URL, {
      apiKey: NOVA_API_KEY,
      modelName: "Address",
      calledMethod: "getStreet",
      methodProperties: {
        CityRef: cityRef,
        FindByString: cityName,
        Page: 1,
        Limit: 5,
      },
    });
    return data;
  } catch (error) {
    console.log(error);
  }
};

module.exports = getStreetRef;
