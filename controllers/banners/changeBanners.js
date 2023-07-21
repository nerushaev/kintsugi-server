const Banners = require("../../models/banners");

const changeBanners = async (req, res) => {
  const banners = req.body;
  const result = await Banners.find({ banners });
};
