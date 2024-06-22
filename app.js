const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");

const origin = "https://kintsugi.org.ua";
// const origin = "http://localhost:5173";

// const origin =
//   process.env.NODE_ENV === "development"
//     ? "http://localhost:3000"
//     : "https://www.kintsugi.org.ua";
// console.log(origin);

const productsRouter = require("./routes/product");
const authRouter = require("./routes/auth");
const orderRouter = require("./routes/order");
const feedbackRouter = require("./routes/feedback");

const app = express();

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(
  cors({
    credentials: true,
    origin,
  })
);

app.set("trust proxy", 1);

app.use(logger(formatsLogger));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
// app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/auth/", authRouter);
app.use("/api/products/", productsRouter);
app.use("/api/orders/", orderRouter);
app.use("/api/feedback/", feedbackRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message });
});

module.exports = app;
