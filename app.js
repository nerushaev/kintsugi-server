const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");

// const origin =
//   process.env.NODE_ENV === "development"
//     ? "http://localhost:3000"
//     : "https://www.kintsugi.org.ua";
const origin =
  // process.env.NODE_ENV === "development"
    // ? "http://localhost:3000"
    "https://kintsugi-black.vercel.app";
console.log(origin);
const productsRouter = require("./routes/product");
const authRouter = require("./routes/auth");
const orderRouter = require("./routes/order");

const app = express();

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(
  cors({
    credentials: true,
    origin,
  })
);

app.use(logger(formatsLogger));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
// app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/auth/", authRouter);
app.use("/api/products/", productsRouter);
app.use("/api/orders/", orderRouter);
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message });
});

module.exports = app;
