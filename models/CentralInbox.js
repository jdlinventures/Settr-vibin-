import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const teamMemberSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "agent"],
      default: "agent",
    },
  },
  { _id: false }
);

const centralInboxSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    teamMembers: [teamMemberSchema],
    warmupKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Index for finding inboxes a user has access to (either owner or team member)
centralInboxSchema.index({ "teamMembers.userId": 1 });

centralInboxSchema.plugin(toJSON);

export default mongoose.models.CentralInbox ||
  mongoose.model("CentralInbox", centralInboxSchema);
