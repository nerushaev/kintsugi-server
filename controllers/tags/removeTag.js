const { failure, success } = require("../../helpers/response");
const Tag = require("../../models/tags");

const removeTag = async (req, res) => {
    const { category, value } = req.body; // Получаем категорию и тег, который нужно удалить
  
    try {
      const tagDoc = await Tag.findOne();
      if (!tagDoc) {
        return failure(res, 'Теги не найдены', 404);
      }
  
      if (tagDoc[category]) {
        const index = tagDoc[category].indexOf(value);
        if (index !== -1) {
          tagDoc[category].splice(index, 1); // Удаляем тег из массива
          await tagDoc.save(); // Сохраняем изменения
          return success(res, tagDoc, 'Тег удален успешно');
        } else {
          return failure(res, 'Тег не найден в категории', 400);
        }
      } else {
        return failure(res, 'Некорректная категория', 400);
      }
    } catch (error) {
      return failure(res, 'Ошибка удаления тега', 500, error.message);
    }
  };

  module.exports = removeTag;