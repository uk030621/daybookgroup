import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    // Google's "sub" claim — the exact same value already stored in
    // Reminder.userId and session.user.id, so no migration is needed to
    // connect existing reminders to this new User record.
    _id: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    lastSignInAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
