const { User } = require("../../models/user");

const addToWishList = async (req,res) => {
  const {product_id} = req.body;
  const {_id, wishes} = req.user;
  const result = wishes.filter(item => item === product_id);

  if(result.length !== 0) {
    res.status(400).json({message: `Product ${product_id} already in wish list! `});
    return;
  }

  await User.findByIdAndUpdate(_id,{
    $push: {
      wishes: product_id,
    }
  })

  const user = await User.findById(_id);

  res.status(200).json({
    message: "Success",
    wishes: user.wishes
  });
};

module.exports = addToWishList;