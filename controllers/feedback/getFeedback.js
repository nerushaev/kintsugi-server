const Feedback = require('../../models/feedback');

const getFeedback = async (req, res) => {
  const product_id = req.params;

  const result = await Feedback.find({...product_id});
  res.json(result);
};

module.exports = getFeedback;
