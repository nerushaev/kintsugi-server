const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildBarcodeStockWorkbook,
  collectBarcodeStock,
} = require("../services/promBarcodeStockFeed");

test("collects product amount and modification size_left by barcode", () => {
  const rows = collectBarcodeStock([
    { barcode: "111", amount: 4, modifications: [] },
    {
      barcode: "",
      amount: 5,
      modifications: [
        { barcode: "222", size_left: 3 },
        { barcode: "333", size_left: 0 },
      ],
    },
  ]);
  assert.deepEqual(rows, [
    { barcode: "111", stock: 4 },
    { barcode: "222", stock: 3 },
    { barcode: "333", stock: 0 },
  ]);
});

test("creates an XLSX containing only code, availability and quantity", () => {
  const { workbook, rowCount } = buildBarcodeStockWorkbook([
    { barcode: "0123456789012", amount: 2, modifications: [] },
    { barcode: "9999999999999", amount: 0, modifications: [] },
  ]);
  const sheet = workbook.getWorksheet("Export Products Sheet");
  assert.equal(rowCount, 2);
  assert.deepEqual(sheet.getRow(1).values.slice(1), [
    "Код_товару",
    "Наявність",
    "Кількість",
  ]);
  assert.deepEqual(sheet.getRow(2).values.slice(1), [
    "0123456789012",
    "+",
    2,
  ]);
  assert.deepEqual(sheet.getRow(3).values.slice(1), [
    "9999999999999",
    "-",
    0,
  ]);
});

test("rejects duplicate barcodes", () => {
  assert.throws(
    () =>
      collectBarcodeStock([
        { barcode: "same", amount: 1, modifications: [] },
        { barcode: "same", amount: 2, modifications: [] },
      ]),
    /PROM_BARCODE_FEED_DUPLICATES:same/
  );
});

test("limits output to an explicit barcode allowlist", () => {
  const rows = collectBarcodeStock(
    [
      { barcode: "keep", amount: 3, modifications: [] },
      { barcode: "skip", amount: 9, modifications: [] },
    ],
    new Set(["keep"])
  );
  assert.deepEqual(rows, [{ barcode: "keep", stock: 3 }]);
});
