const { Schema, model } = require("mongoose");

const posterWebhookEventSchema = new Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedAt: Date,
    processedAt: Date,
    lastError: String,
  },
  { versionKey: false, timestamps: true }
);

posterWebhookEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

module.exports = model("posterWebhookEvent", posterWebhookEventSchema);
