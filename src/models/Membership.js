import mongoose, { Schema } from "mongoose";

const MembershipSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    // Set once the invited person actually signs in and joins. Null while
    // status is "invited" — we don't know their Google sub yet, only the
    // email address the admin invited.
    userId: {
      type: String,
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["invited", "active"],
      default: "invited",
    },
    invitedEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // User._id (Google sub) of whoever sent the invite.
    invitedBy: {
      type: String,
      required: true,
    },
    // Random token embedded in the invite link. Cleared (unset entirely,
    // not set to null) once accepted — the sparse unique index below only
    // excludes documents where this field is genuinely absent, not ones
    // where it's explicitly null, so it must never be given a default.
    inviteToken: {
      type: String,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// One membership row per (group, invited email) — prevents double-inviting
// the same address to the same group.
MembershipSchema.index({ groupId: 1, invitedEmail: 1 }, { unique: true });
// Sparse because inviteToken is null once a membership becomes active.
MembershipSchema.index({ inviteToken: 1 }, { unique: true, sparse: true });

export default mongoose.models.Membership ||
  mongoose.model("Membership", MembershipSchema);
