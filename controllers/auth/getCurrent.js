const getCurrent = async (req, res) => {
  const { email, name, phone, role, orders, delivery, verify, avatarURL } =
    req.user;

  res.json({
    email,
    name,
    phone,
    role,
    orders,
    delivery,
    verify,
    avatarURL,
  });
};

module.exports = getCurrent;
