const { User } = require("../../models/user");

const updateUserDelivery = async (req, res) => {
  const data = await User.findByIdAndUpdate(req.user._id, {
    delivery: { ...req.body },
  });

  res.status(200).json({
    ...data.delivery,
  });
};

module.exports = updateUserDelivery;
