const Feedback = require('../../models/feedback');

const removeFeedback = async (req, res) => {
  const {_id} = req.params;
  console.log(_id);
  const result = await Feedback.findByIdAndDelete({_id});
  console.log("result", result);
  res.json(result);
};

module.exports = removeFeedback;