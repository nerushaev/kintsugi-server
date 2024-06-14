const Feedback = require('../../models/feedback');

const getFeedback = async (req, res) => {
  const productId = req.params;
  console.log(productId);

  const result = await Feedback.find({...productId});
  console.log(result);
  res.json(result);
};

module.exports = getFeedback;
