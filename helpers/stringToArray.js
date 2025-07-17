const stringToArray = (inputString) => {
    if (typeof inputString !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // Разделяем строку по запятой и убираем лишние пробелы
    return inputString.split(',').map(item => item.trim());
  }

  
module.exports = stringToArray;