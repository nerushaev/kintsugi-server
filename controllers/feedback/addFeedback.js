const Feedback = require('../../models/feedback');
const Product = require('../../models/product');

const addFeedback = async (req, res) => {
  const {product_id} = req.body;
  const result = await Feedback.create({
    ...req.body,
  });

  const makeNewScore = (data) => {
    const {score, scoreAmount} = data;
    if (scoreAmount === 0) {
      return {
        score: req.body.score,
        scoreAmount: 1
      }
    }
    const newScore = ((score * scoreAmount) + req.body.score) / (scoreAmount + 1);

    const newAmount = scoreAmount + 1
    return {
      score: newScore.toFixed(2),
      scoreAmount: newAmount
    }
  }

  const data = await Product.findOne({product_id: product_id});
  const newScoreData = makeNewScore(data);

  const newScoreResult = await Product.findOneAndUpdate({product_id: product_id},
    {...newScoreData,}
  )

  console.log(newScoreResult);

  res.status(201).json({result});
}

module.exports = addFeedback;


