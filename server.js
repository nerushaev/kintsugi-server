const app = require('./app');
const mongoose = require('mongoose'); 
const { startPosterWebhookWorker } = require('./services/posterWebhookWorker');
const { startProductImageWorker } = require('./services/productImageWorker');
const { startPurchaseAnalyticsWorker } = require('./services/purchaseAnalyticsWorker');

const { DB_HOST, PORT = 5000, HOSTNAME } = process.env;
console.log(HOSTNAME);
mongoose.set("strictQuery", true);

mongoose.connect(DB_HOST)
  .then(async () => {
    await startPosterWebhookWorker();
    startProductImageWorker();
    startPurchaseAnalyticsWorker();
    app.listen(PORT, HOSTNAME)
    console.log("Database connection successful");
  })
  .catch(e => {
    console.log(e.message)
    process.exit(1)
  });
