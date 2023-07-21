const { Schema, model } = require("mongoose");

const bannersSchema = new Schema({
  name: {
    type: String,
    required: [true, "Set name for banners!"],
  },
  url: {
    type: String,
    required: [true, "Set url for banners!"],
  },
});

const Banners = model("banner", bannersSchema);

module.exports = Banners;
