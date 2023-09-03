const app = require('./app');
const mongoose = require('mongoose'); 

const { DB_HOST, PORT = 3001, HOSTNAME } = process.env;

mongoose.set("strictQuery", true);

mongoose.connect(DB_HOST)
  .then(() => {
    app.listen(PORT, HOSTNAME)
    console.log("Database connection successful");
  })
  .catch(e => {
    console.log(e.message)
    process.exit(1)
  });