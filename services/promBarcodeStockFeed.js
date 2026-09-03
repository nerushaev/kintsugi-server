const ExcelJS = require("exceljs");

const asBarcode = (value) => String(value ?? "").trim();
const asName = (value) => String(value ?? "").trim();

const normalizeStock = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const collectBarcodeStock = (products, allowedBarcodes = null) => {
  const rows = [];
  const seen = new Set();
  const duplicates = new Set();
  const add = (barcodeValue, stockValue, nameValue) => {
    const barcode = asBarcode(barcodeValue);
    if (!barcode) return;
    if (allowedBarcodes && !allowedBarcodes.has(barcode)) return;
    if (seen.has(barcode)) duplicates.add(barcode);
    seen.add(barcode);
    rows.push({
      barcode,
      name: asName(nameValue) || `Товар ${barcode}`,
      stock: normalizeStock(stockValue),
    });
  };

  products.forEach((product) => {
    const modifications = Array.isArray(product.modifications)
      ? product.modifications
      : [];
    if (modifications.length) {
      modifications.forEach((modification) => {
        const variantName = asName(modification.modificator_name);
        const productName = asName(product.product_name);
        add(
          modification.barcode,
          modification.size_left,
          [productName, variantName].filter(Boolean).join(" — ")
        );
      });
    } else {
      add(product.barcode, product.amount, product.product_name);
    }
  });

  if (duplicates.size) {
    throw new Error(
      `PROM_BARCODE_FEED_DUPLICATES:${[...duplicates].sort().join(",")}`
    );
  }
  return rows.sort((left, right) => left.barcode.localeCompare(right.barcode));
};

const buildBarcodeStockWorkbook = (products, allowedBarcodes = null) => {
  const rows = collectBarcodeStock(products, allowedBarcodes);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kintsugi";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Export Products Sheet");
  sheet.columns = [
    { header: "Код_товару", key: "code", width: 28 },
    { header: "Назва_позиції", key: "name", width: 48 },
    { header: "Наявність", key: "availability", width: 14 },
    { header: "Кількість", key: "quantity", width: 14 },
  ];
  rows.forEach(({ barcode, name, stock }) => {
    sheet.addRow({
      code: barcode,
      name,
      availability: stock > 0 ? "+" : "-",
      quantity: stock,
    });
  });
  sheet.getColumn(1).numFmt = "@";
  sheet.getColumn(4).numFmt = "0";
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "D1" };
  return { workbook, rowCount: rows.length };
};

module.exports = { buildBarcodeStockWorkbook, collectBarcodeStock };
