const { default: axios } = require("axios");
const Poster = require("../../models/poster");

const getProducts = async (req, res) => {
  const {data} = await axios.get('https://joinposter.com/api/storage.getStorageLeftovers?token=557730:9413016fab1cf0bf9862221c9c83a809');

  data.response.map(item  => {
    const {ingredient_id, ingredient_name, ingredient_left} = item;
    Poster.create({
      ingredient_id,
      ingredient_name,
      ingredient_left
    })
  })
}

module.exports = getProducts;