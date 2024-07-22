const { User } = require("../../models/user");

const removeFromWish = async (req,res) => {
  const {_id, wishes} = req.user;
  const {product_id} = req.body;

  const filteredWishes = wishes.filter(item => item !== product_id);

  await User.findByIdAndUpdate(_id, {
    $set: {
      wishes: filteredWishes
    }
  })

  res.status(200).json({
    wishes: filteredWishes
  });
};

module.exports = removeFromWish;