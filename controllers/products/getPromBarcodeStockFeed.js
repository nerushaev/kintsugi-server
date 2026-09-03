const crypto = require("crypto");
const createError = require("http-errors");
const Product = require("../../models/product");
const {
  buildBarcodeStockWorkbook,
} = require("../../services/promBarcodeStockFeed");

const TEST_BARCODES = new Set([
  "3069215701485",
  "5164873821003",
  "5780492398614",
  "2983235478365",
  "5496958435257",
  "3433477745963",
  "6689873235525",
  "5527994462392",
  "7227725757939",
  "0879600960711",
  "6021812138170",
  "3108643000073",
  "0101045359139",
]);

const validToken = (providedToken) => {
  const expected = String(process.env.PROM_STOCK_FEED_TOKEN || "").trim();
  const provided = String(providedToken || "");
  if (!expected) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
};

const getPromBarcodeStockFeed = async (req, res) => {
  if (!validToken(req.query.token)) {
    throw createError(401, "Invalid feed token");
  }
  const scope = String(req.query.scope || "test").toLowerCase();
  if (!new Set(["test", "all"]).has(scope)) {
    throw createError(400, "Feed scope must be test or all");
  }
  const products = await Product.find(
    {
      $or: [
        { barcode: { $type: "string", $ne: "" } },
        { "modifications.barcode": { $type: "string", $ne: "" } },
      ],
    },
    "product_name barcode amount modifications"
  ).lean();
  const { workbook, rowCount } = buildBarcodeStockWorkbook(
    products,
    scope === "test" ? TEST_BARCODES : null
  );
  const output = await workbook.xlsx.writeBuffer();
  res.set({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition":
      'inline; filename="kintsugi-prom-stock-by-barcode.xlsx"',
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Kintsugi-Feed-Mode": "stock-only-by-barcode",
    "X-Kintsugi-Feed-Rows": String(rowCount),
    "X-Kintsugi-Feed-Scope": scope,
  });
  res.status(200).send(Buffer.from(output));
};

module.exports = getPromBarcodeStockFeed;
