const Feedback = require('../../models/feedback');
const Product = require('../../models/product');

const removeFeedback = async (req, res) => {
  const {_id} = req.params;


  const result = await Feedback.findByIdAndDelete({_id});

  const makeScoreRemove = (data) => {
    const {score, scoreAmount} = data;

    if(scoreAmount === 1) {
      return {
        score: 0,
        scoreAmount: 0
      }
    }

    const newScore = ((score * scoreAmount) - result.score) / (scoreAmount - 1);

    const newAmount = scoreAmount - 1
    return {
      score: newScore.toFixed(2),
      scoreAmount: newAmount
    }
  }

  const data = await Product.findOne({product_id: result.product_id});
  const resultScore = makeScoreRemove(data);

  const newScoreResult = await Product.findOneAndUpdate({product_id: result.product_id},
    {...resultScore,}
  )

  res.json(result);
};

module.exports = removeFeedback;