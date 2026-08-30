import mongoose, { Schema } from "mongoose";

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // User._id (Google sub) of whoever created the group. Not necessarily
    // still an admin forever — admin status itself lives on Membership.
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Group || mongoose.model("Group", GroupSchema);
