const PosterWebhookEvent = require("../models/posterWebhookEvent");
const webHookPoster = require("../controllers/poster/webHookPoster");

const POLL_INTERVAL_MS = 1000;
const MAX_ATTEMPTS = 8;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
const STALE_LOCK_MS = 5 * 60 * 1000;

let timer;
let isRunning = false;

const retryDelay = (attempts) =>
  Math.min(1000 * 2 ** Math.max(0, attempts - 1), MAX_RETRY_DELAY_MS);

const processNextEvent = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const event = await PosterWebhookEvent.findOneAndUpdate(
      {
        status: "pending",
        nextAttemptAt: { $lte: new Date() },
      },
      {
        $set: { status: "processing", lockedAt: new Date() },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!event) return;

    try {
      await webHookPoster.processPosterEvent(event.payload);
      await PosterWebhookEvent.updateOne(
        { _id: event._id },
        {
          $set: { status: "completed", processedAt: new Date() },
          $unset: { lockedAt: 1, lastError: 1 },
        }
      );
    } catch (error) {
      const failed = event.attempts >= MAX_ATTEMPTS;
      await PosterWebhookEvent.updateOne(
        { _id: event._id },
        {
          $set: {
            status: failed ? "failed" : "pending",
            nextAttemptAt: new Date(Date.now() + retryDelay(event.attempts)),
            lastError: String(error?.message || error).slice(0, 1000),
          },
          $unset: { lockedAt: 1 },
        }
      );
      console.error(
        `Poster webhook ${event.eventKey} processing failed on attempt ${event.attempts}: ${String(
          error?.message || error
        ).slice(0, 1000)}`
      );
    }
  } catch (error) {
    console.error("Poster webhook worker failed:", error);
  } finally {
    isRunning = false;
  }
};

const startPosterWebhookWorker = async () => {
  if (timer) return;

  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  await PosterWebhookEvent.updateMany(
    { status: "processing", lockedAt: { $lt: staleBefore } },
    {
      $set: { status: "pending", nextAttemptAt: new Date() },
      $unset: { lockedAt: 1 },
    }
  );

  await processNextEvent();
  timer = setInterval(processNextEvent, POLL_INTERVAL_MS);
};

module.exports = { startPosterWebhookWorker };
