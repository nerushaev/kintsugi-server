const Bundle = require("../../models/bundle");

const getBundles = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      // Ищем по bundle_id, а не _id
      const bundles = await Bundle.findOne({ bundle_id: id }).populate("products");
      if (!bundles) {
        return res.status(404).json({ message: "Bundles not found" });
      }

      return res.status(200).json({ bundles });
    }

    // Без ID — возвращаем все бандлы
    const bundles = await Bundle.find({}).populate("products");
    res.status(200).json({ bundles });

  } catch (error) {
    console.error("getBundles error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = getBundles;
