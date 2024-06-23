const { Schema, model } = require("mongoose");

const posterSchema = new Schema({
  ingredient_id: {
    type: String,
    required: true,
  },
  ingredient_name: {
    type: String,
    required: true,
  },
  ingredient_left: {
    type: Number,
    required: true,
  },
});

const Poster = model("poster", posterSchema);

module.exports = Poster;
