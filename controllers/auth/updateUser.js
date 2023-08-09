const { User } = require("../../models/user");

const updateUser = async (req, res) => {
  console.log(req.body);
  const data = await User.findByIdAndUpdate(req.user._id, {
    delivery: { ...req.body },
  });

  res.status(200).json({
    ...data.delivery,
  });
};

module.exports = updateUser;
