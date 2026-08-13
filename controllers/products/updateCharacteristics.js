const Product = require("../../models/product");

const CHARACTERISTIC_FIELDS = [
  "material",
  "color",
  "equipment",
  "character",
  "fandom",
];

const updateCharacteristics = async (req, res) => {
  const updates = {};

  for (const field of CHARACTERISTIC_FIELDS) {
    const value = req.body?.[field];
    if (value !== undefined && typeof value !== "string") {
      return res.status(400).json({ message: "Характеристики мають бути текстом" });
    }
    if (typeof value === "string") {
      const normalized = value.trim().replace(/\s+/g, " ");
      if (normalized.length > 500) {
        return res.status(400).json({ message: "Значення характеристики занадто довге" });
      }
      updates[field] = normalized;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Немає характеристик для збереження" });
  }

  const product = await Product.findOneAndUpdate(
    { product_id: req.params.product_id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!product) {
    return res.status(404).json({ message: "Товар не знайдено" });
  }

  return res.json({ message: "Характеристики збережено", product });
};

module.exports = updateCharacteristics;
