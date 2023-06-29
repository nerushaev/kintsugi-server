const express = require('express');
const cors = require('cors');
const logger = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const productsRouter = require('./routes/product');
const authRouter = require('./routes/auth');

const app = express();

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short'

app.use(cors());
app.use(logger(formatsLogger));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
// app.use(express.static("public"));

app.use('/api/auth/', authRouter)
app.use('/api/products/', productsRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message: err.message })
})

module.exports = app;
