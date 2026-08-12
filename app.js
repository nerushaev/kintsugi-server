const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cookieParser = require("cookie-parser");
const cors = require("cors");

const allowedOrigins = [
  "https://kintsugi.org.ua",
  "https://www.kintsugi.org.ua",
  "http://localhost:3000"
];
const productsRouter = require("./routes/product");
const authRouter = require("./routes/auth");
const orderRouter = require("./routes/order");
const feedbackRouter = require("./routes/feedback");
const posterRouter = require("./routes/poster");
const metaRouter = require("./routes/meta");
const bundleRouter = require("./routes/bundle");
const tagsRouter = require("./routes/tags");
const deliveryRouter = require("./routes/delivery");

const app = express();

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
}));

app.set("trust proxy", 1);

app.use(logger(formatsLogger));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({
  verify: (req, _res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  },
}));
// app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/auth/", authRouter);
app.use("/api/products/", productsRouter);
app.use("/api/orders/", orderRouter);
app.use("/api/feedback/", feedbackRouter);
app.use("/api/poster/", posterRouter);
app.use("/api/meta/", metaRouter);
app.use("/api/bundle/", bundleRouter);
app.use("/api/tags/", tagsRouter);
app.use("/api/delivery/", deliveryRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message });
});

module.exports = app;
