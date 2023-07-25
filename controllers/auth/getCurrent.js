const getCurrent = async (req, res) => {
  const { email, name, phone, role, orders, delivery, verify } = req.user;

  res.json({
    email,
    name,
    phone,
    role,
    orders,
    delivery,
    verify,
  });
};

module.exports = getCurrent;
