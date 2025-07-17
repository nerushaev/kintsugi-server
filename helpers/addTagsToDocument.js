const Tag = require("../models/tags");

// Функція для додавання даних у колекцію тегів
const addTagsToDocument = async (data) => {
  try {
    const tagDoc = await Tag.findOne(); // Знаходимо документ з тегами
    if (!tagDoc) {
      throw new Error('Документ з тегами не знайдено');
    }

    // Функція для перевірки наявності значення в іншому полі
    const checkIfExistsInOtherFields = (value) => {
      const fields = ['tags', 'types', 'fandoms', 'characters', 'materials', 'colors'];
      for (let field of fields) {
        if (tagDoc[field].includes(value)) {
          return field; // Якщо значення є в іншому полі, повертаємо назву поля
        }
      }
      return null; // Якщо значення не знайдено в інших полях
    };

    const duplicateErrors = [];

    // Перевіряємо кожне поле на наявність дублікатів і добавляємо теги лише якщо їх немає в інших полях
    if (data.tags) {
      data.tags.forEach(tag => {
        // Перевірка на наявність тегу в інших полях
        const existingField = checkIfExistsInOtherFields(tag);
        if (existingField && !tagDoc.tags.includes(tag)) { // Только если тег есть в другом поле, добавляем ошибку
          duplicateErrors.push({
            field: 'tags',
            message: `'${tag}' вже існує в полі '${existingField}'`,
            tag: tag
          });
        } else if (!tagDoc.tags.includes(tag)) {
          tagDoc.tags.push(tag); // Додаємо тег, якщо він відсутній у цьому полі
        }
      });
    }

    if (data.type) {
      data.type.forEach(t => {
        const existingField = checkIfExistsInOtherFields(t);
        if (existingField && !tagDoc.types.includes(t)) { // Только если тип есть в другом поле, добавляем ошибку
          duplicateErrors.push({
            field: 'types',
            message: `'${t}' вже існує в полі '${existingField}'`,
            tag: t
          });
        } else if (!tagDoc.types.includes(t)) {
          tagDoc.types.push(t); // Додаємо тип, якщо він відсутній у цьому полі
        }
      });
    }

    if (data.fandom) {
      data.fandom.forEach(f => {
        const existingField = checkIfExistsInOtherFields(f);
        if (existingField && !tagDoc.fandoms.includes(f)) { // Только если фандом есть в другом поле, добавляем ошибку
          duplicateErrors.push({
            field: 'fandoms',
            message: `'${f}' вже існує в полі '${existingField}'`,
            tag: f
          });
        } else if (!tagDoc.fandoms.includes(f)) {
          tagDoc.fandoms.push(f); // Додаємо фандом, якщо він відсутній у цьому полі
        }
      });
    }

    if (data.character) {
      data.character.forEach(c => {
        const existingField = checkIfExistsInOtherFields(c);
        if (existingField && !tagDoc.characters.includes(c)) { // Только если персонаж есть в другом поле, добавляем ошибку
          duplicateErrors.push({
            field: 'characters',
            message: `'${c}' вже існує в полі '${existingField}'`,
            tag: c
          });
        } else if (!tagDoc.characters.includes(c)) {
          tagDoc.characters.push(c); // Додаємо персонажа, якщо він відсутній у цьому полі
        }
      });
    }

    if (data.material) {
      data.material.forEach(m => {
        const existingField = checkIfExistsInOtherFields(m);
        if (existingField && !tagDoc.materials.includes(m)) { // Только если материал есть в другом поле, добавляем ошибку
          duplicateErrors.push({
            field: 'materials',
            message: `'${m}' вже існує в полі '${existingField}'`,
            tag: m
          });
        } else if (!tagDoc.materials.includes(m)) {
          tagDoc.materials.push(m); // Додаємо матеріал, якщо він відсутній у цьому полі
        }
      });
    }

    if (data.color) {
      data.color.forEach(c => {
        const existingField = checkIfExistsInOtherFields(c);
        if (existingField && !tagDoc.colors.includes(c)) { // Только если цвет есть в другом поле, добавляем ошибку
          duplicateErrors.push({
            field: 'colors',
            message: `'${c}' вже існує в полі '${existingField}'`,
            tag: c
          });
        } else if (!tagDoc.colors.includes(c)) {
          tagDoc.colors.push(c); // Додаємо колір, якщо він відсутній у цьому полі
        }
      });
    }

    // Якщо знайдено дублікати, генеруємо помилку з конкретними повідомленнями
    if (duplicateErrors.length > 0) {
      throw new Error(JSON.stringify(duplicateErrors));
    }

    // Зберігаємо зміни в документі тегів
    await tagDoc.save();

    return { success: true, message: 'Теги успішно оновлені' };
  } catch (error) {
    console.error("Помилка оновлення тегів:", error);

    // Обробка помилки для відображення зрозумілих повідомлень на клієнті
    let errorMessages = [];
    if (error.message) {
      try {
        const parsedErrors = JSON.parse(error.message);
        parsedErrors.forEach(err => {
          errorMessages.push({
            field: err.field,
            message: err.message,
            tag: err.tag
          });
        });
      } catch (e) {
        errorMessages.push({ message: error.message });
      }
    }

    return { success: false, message: 'Помилка оновлення тегів', errors: errorMessages };
  }
};

module.exports = addTagsToDocument;
