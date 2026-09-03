const ExcelJS = require("exceljs");

const REQUIRED_HEADERS = [
  "Код_товару",
  "Наявність",
  "Кількість",
  "Унікальний_ідентифікатор",
];

const asText = (value) => {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) {
    return String(value.text || "").trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String(value.result || "").trim();
  }
  return String(value).trim();
};

const normalizeStock = (value) => {
  const parsed = Number(asText(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const getSheetContext = (workbook) => {
  const sheet =
    workbook.getWorksheet("Export Products Sheet") || workbook.worksheets[0];
  if (!sheet) throw new Error("PROM_FEED_TEMPLATE_HAS_NO_WORKSHEET");

  const headers = new Map();
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
    const header = asText(cell.value);
    if (header && !headers.has(header)) headers.set(header, column);
  });
  const missing = REQUIRED_HEADERS.filter((header) => !headers.has(header));
  if (missing.length) {
    throw new Error(`PROM_FEED_TEMPLATE_MISSING_COLUMNS:${missing.join(",")}`);
  }

  return { sheet, headers };
};

const getTemplateBarcodes = (workbook) => {
  const { sheet, headers } = getSheetContext(workbook);
  const codeColumn = headers.get("Код_товару");
  const uniqueIdColumn = headers.get("Унікальний_ідентифікатор");
  const barcodes = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const barcode = asText(row.getCell(codeColumn).value);
    const promUniqueId = asText(row.getCell(uniqueIdColumn).value);
    if (barcode && promUniqueId) barcodes.push(barcode);
  }
  return [...new Set(barcodes)];
};

const buildStockIndex = (products) => {
  const stockByBarcode = new Map();
  const duplicates = new Set();
  const add = (barcodeValue, stockValue) => {
    const barcode = asText(barcodeValue);
    if (!barcode) return;
    if (stockByBarcode.has(barcode)) duplicates.add(barcode);
    stockByBarcode.set(barcode, normalizeStock(stockValue));
  };

  products.forEach((product) => {
    add(product.barcode, product.amount);
    const modifications = Array.isArray(product.modifications)
      ? product.modifications
      : [];
    modifications.forEach((modification) => {
      add(modification.barcode, modification.size_left);
    });
  });
  if (duplicates.size) {
    throw new Error(
      `PROM_FEED_DUPLICATE_BARCODES:${[...duplicates].sort().join(",")}`
    );
  }
  return stockByBarcode;
};

const updateWorkbookStock = (workbook, products) => {
  const { sheet, headers } = getSheetContext(workbook);
  const codeColumn = headers.get("Код_товару");
  const uniqueIdColumn = headers.get("Унікальний_ідентифікатор");
  const availabilityColumn = headers.get("Наявність");
  const quantityColumn = headers.get("Кількість");
  const stockByBarcode = buildStockIndex(products);
  let updatedRows = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const barcode = asText(row.getCell(codeColumn).value);
    const promUniqueId = asText(row.getCell(uniqueIdColumn).value);
    if (!barcode || !promUniqueId) continue;
    const stock = stockByBarcode.get(barcode) || 0;
    row.getCell(quantityColumn).value = stock;
    row.getCell(availabilityColumn).value = stock > 0 ? "+" : "-";
    updatedRows += 1;
  }
  if (!updatedRows) throw new Error("PROM_FEED_TEMPLATE_HAS_NO_MAPPED_ROWS");
  return updatedRows;
};

const loadWorkbook = async (templatePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  return workbook;
};

module.exports = {
  buildStockIndex,
  getTemplateBarcodes,
  loadWorkbook,
  normalizeStock,
  updateWorkbookStock,
};
