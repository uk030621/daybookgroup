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
    // Set by the app's owner to revoke someone's access. A blocked person
    // can't sign in, and any session they already have stops working.
    // Nothing of theirs is deleted, so unblocking restores everything.
    blocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
