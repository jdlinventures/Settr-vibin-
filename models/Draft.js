import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const emailParticipantSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  { _id: false }
);

const draftSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    centralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
      required: true,
    },
    // The email this is a reply to (if any)
    replyToEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Email",
    },
    // Which connected email account to send from
    sendFromEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedEmail",
    },
    to: [emailParticipantSchema],
    cc: [emailParticipantSchema],
    bcc: [emailParticipantSchema],
    subject: {
      type: String,
      trim: true,
    },
    bodyHtml: {
      type: String,
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Index for finding drafts by user and reply context
draftSchema.index({ userId: 1, replyToEmailId: 1 });

draftSchema.plugin(toJSON);

export default mongoose.models.Draft || mongoose.model("Draft", draftSchema);
