const { addTagsToDocument } = require("../../helpers");
const ProductMeta = require("../../models/productsMeta");

const changeMeta = async (req, res) => {
  const { tags, type, material, color, fandom, character } = req.body;
  console.log(tags);

  // Пробуем обновить теги
  const addTagsResult = await addTagsToDocument({
    tags,
    type,
    fandom,
    character,
    material,
    color,
  });


  // Если произошла ошибка при добавлении тегов, возвращаем её
  if (!addTagsResult.success) {
    // Если есть ошибки, отправляем массив с ошибками
    return res.status(400).json({
      message: addTagsResult.message, // Основное сообщение
      errors: addTagsResult.errors,   // Массив ошибок с деталями
    });
  }

  try {
    const { product_id, ...metaData } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: "product_id обязателен" });
    }

    // Пытаемся найти существующий мета-объект
    const existingMeta = await ProductMeta.findOne({ product_id });

    if (existingMeta) {
      // Обновляем существующий документ
      await ProductMeta.updateOne({ product_id }, metaData);
      return res.json({ message: "Мета-данные успешно обновлены" });
    } else {
      // Создаём новый документ
      await ProductMeta.create({ product_id, ...metaData });
      return res.json({ message: "Мета-данные успешно созданы" });
    }
  } catch (error) {
    console.error("Ошибка обновления мета-данных:", error);
    return res.status(500).json({ message: "Ошибка сервера при сохранении мета-данных" });
  }
};

module.exports = changeMeta;
