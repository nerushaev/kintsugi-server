const { default: axios } = require("axios");
const Poster = require("../../models/poster");

const webHookPoster = async (req, res) => {
  console.log(req);

  res.status(200).send("Success")
}

module.exports = webHookPoster;