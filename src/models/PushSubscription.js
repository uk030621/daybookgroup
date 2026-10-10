import mongoose, { Schema } from "mongoose";

// One row per browser/device that has switched notifications on. A person
// with a phone and a laptop has two rows. `endpoint` is the unique address
// the browser's push service gave us for that device.
const PushSubscriptionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
