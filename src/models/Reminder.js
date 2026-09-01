import mongoose, { Schema } from "mongoose";

const ReminderSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // IANA timezone (e.g. "Europe/London"), captured from the browser at
    // creation time. Used only to format the due time correctly in reminder
    // emails — the stored dueDate itself is always a real UTC instant.
    timezone: {
      type: String,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "General",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    // Set to a Group's _id to make this reminder visible to every active
    // member of that group. Null (the default) means fully private — only
    // the owner can see it. A reminder can be shared with at most one group.
    sharedWithGroupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    // How long before dueDate to email a reminder. null/0 means "at the due
    // moment itself". Only meaningful when dueDate is set.
    remindMinutesBefore: {
      type: Number,
      default: 60,
    },
    // Set once the lead-time email has actually been sent, so the cron job
    // never emails the same reminder twice. Cleared whenever dueDate or
    // remindMinutesBefore changes, so edits get a fresh email at the new time.
    reminderEmailSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Powers the cron job's "what's due for an email right now" query.
ReminderSchema.index({ completed: 1, dueDate: 1, reminderEmailSentAt: 1 });

// Text index powers the search bar (title, notes, category)
ReminderSchema.index({ title: "text", notes: "text", category: "text" });
ReminderSchema.index({ userId: 1, completed: 1, dueDate: 1 });

export default mongoose.models.Reminder ||
  mongoose.model("Reminder", ReminderSchema);
