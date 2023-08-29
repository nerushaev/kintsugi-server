const getCurrent = async (req, res) => {
  // const { email, name, phone, role, orders, delivery, verify, avatarURL } =
  //   req.user;

  res.json({
    user: req.user,
  });
};

module.exports = getCurrent;
