const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");
const {
  buildStockIndex,
  getTemplateBarcodes,
  updateWorkbookStock,
} = require("../services/promStockFeed");

const workbookFixture = () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export Products Sheet");
  sheet.addRow([
    "Код_товару",
    "Наявність",
    "Кількість",
    "Унікальний_ідентифікатор",
  ]);
  sheet.addRow(["parent-code", "+", 99, "prom-1"]);
  sheet.addRow(["size-s", "+", 99, "prom-2"]);
  sheet.addRow(["missing-code", "+", 99, "prom-3"]);
  return workbook;
};

test("uses amount for products and size_left for modifications", () => {
  const index = buildStockIndex([
    {
      barcode: "parent-code",
      amount: 7,
      modifications: [{ barcode: "size-s", size_left: 2 }],
    },
  ]);
  assert.equal(index.get("parent-code"), 7);
  assert.equal(index.get("size-s"), 2);
});

test("updates only stock columns and zeroes missing mapped barcodes", () => {
  const workbook = workbookFixture();
  assert.deepEqual(getTemplateBarcodes(workbook), [
    "parent-code",
    "size-s",
    "missing-code",
  ]);
  const updatedRows = updateWorkbookStock(workbook, [
    {
      barcode: "parent-code",
      amount: 4,
      modifications: [{ barcode: "size-s", size_left: 0 }],
    },
  ]);
  const sheet = workbook.getWorksheet("Export Products Sheet");
  assert.equal(updatedRows, 3);
  assert.deepEqual(sheet.getRow(2).values.slice(1), [
    "parent-code",
    "+",
    4,
    "prom-1",
  ]);
  assert.deepEqual(sheet.getRow(3).values.slice(1), [
    "size-s",
    "-",
    0,
    "prom-2",
  ]);
  assert.deepEqual(sheet.getRow(4).values.slice(1), [
    "missing-code",
    "-",
    0,
    "prom-3",
  ]);
});

test("rejects duplicate barcodes", () => {
  assert.throws(
    () =>
      buildStockIndex([
        { barcode: "same", amount: 1 },
        { barcode: "same", amount: 2 },
      ]),
    /PROM_FEED_DUPLICATE_BARCODES:same/
  );
});
