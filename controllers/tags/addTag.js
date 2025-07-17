const { failure, success } = require("../../helpers/response");
const Tag = require("../../models/tags");

const addTags = async (req, res) => {
  const tagsArray = req.body;  // Получаем массив объектов с категориями и значениями
  
  try {
    // Проверяем, что tagsArray — это массив
    if (!Array.isArray(tagsArray) || tagsArray.length === 0) {
      return failure(res, "Массив категорий и значений не может быть пустым", 400);
    }

    // Находим документ с тегами
    const tagDoc = await Tag.findOne();
    if (!tagDoc) {
      return failure(res, 'Теги не найдены', 404);
    }

    // Обрабатываем каждую категорию в массиве tagsArray
    for (let tag of tagsArray) {
      const { category, values } = tag;
      
      // Проверяем, что values — это массив
      if (!Array.isArray(values) || values.length === 0) {
        return failure(res, `Массив значений для категории ${category} не может быть пустым`, 400);
      }

      // Проверяем, существует ли такая категория в документе
      if (tagDoc[category]) {
        // Для каждого значения в массиве values
        values.forEach(value => {
          if (!tagDoc[category].includes(value)) {
            tagDoc[category].push(value);  // Добавляем новый тег в массив, если его нет
          }
        });
      } else {
        return failure(res, `Некорректная категория: ${category}`, 400);
      }
    }

    // Сохраняем изменения
    await tagDoc.save();
    return success(res, tagDoc, 'Теги добавлены успешно');

  } catch (error) {
    return failure(res, 'Ошибка добавления тегов', 500, error.message);
  }
};

module.exports = addTags;
