const { Schema, model } = require("mongoose");

const feedbackSchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  product_id: {
    type: String,
    require: true,
  },
  score: {
    type: Number,
    require: true,
  },
  comment: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  date: {
    type: String,
  }
});

const Feedback = model("feedback", feedbackSchema);

module.exports = Feedback;