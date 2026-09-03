const crypto = require("crypto");
const path = require("path");
const createError = require("http-errors");
const Product = require("../../models/product");
const {
  getTemplateBarcodes,
  loadWorkbook,
  updateWorkbookStock,
} = require("../../services/promStockFeed");

const hasValidToken = (providedToken) => {
  const expectedToken = String(process.env.PROM_STOCK_FEED_TOKEN || "").trim();
  const provided = String(providedToken || "");
  if (!expectedToken) return false;
  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
};

const getPromStockFeed = async (req, res) => {
  if (!hasValidToken(req.query.token)) {
    throw createError(401, "Invalid feed token");
  }

  const templatePath =
    process.env.PROM_STOCK_TEMPLATE_PATH ||
    path.join(__dirname, "..", "..", "data", "prom", "stock-template.xlsx");
  const workbook = await loadWorkbook(templatePath);
  const barcodes = getTemplateBarcodes(workbook);
  const products = await Product.find(
    {
      $or: [
        { barcode: { $in: barcodes } },
        { "modifications.barcode": { $in: barcodes } },
      ],
    },
    "barcode amount modifications"
  ).lean();
  const updatedRows = updateWorkbookStock(workbook, products);
  const output = await workbook.xlsx.writeBuffer();

  res.set({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": 'inline; filename="kintsugi-prom-stock.xlsx"',
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Kintsugi-Feed-Mode": "stock-only",
    "X-Kintsugi-Feed-Rows": String(updatedRows),
  });
  res.status(200).send(Buffer.from(output));
};

module.exports = getPromStockFeed;
