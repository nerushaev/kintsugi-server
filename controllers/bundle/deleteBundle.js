const Bundle = require("../../models/bundle");
const ProductMeta = require("../../models/productsMeta");

const removeBundle = async (req, res) => {
  try {
    const { bundle_id } = req.params;

    if (!bundle_id) {
      return res.status(400).json({ message: "bundle_id is required" });
    }

    // Удаляем сам бандл
    const deleted = await Bundle.findOneAndDelete({ bundle_id });

    if (!deleted) {
      return res.status(404).json({ message: "Бандл не найден" });
    }

    // Удаляем из inBundles у товаров
    await ProductMeta.updateMany(
      { inBundles: bundle_id },
      { $pull: { inBundles: bundle_id } }
    );

    res.json({ message: "Бандл успешно удалён", bundle_id });
  } catch (error) {
    console.error("Ошибка при удалении бандла:", error.message);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

module.exports = removeBundle;
