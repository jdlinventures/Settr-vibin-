import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const connectedEmailSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    emailAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    provider: {
      type: String,
      enum: ["gmail", "smtp"],
      required: true,
    },
    // Encrypted OAuth tokens for Gmail (JSON string)
    oauthTokens: {
      type: String,
      private: true,
    },
    // Encrypted SMTP/IMAP config (JSON string)
    smtpConfig: {
      type: String,
      private: true,
    },
    status: {
      type: String,
      enum: ["connected", "error", "disconnected"],
      default: "connected",
    },
    errorMessage: {
      type: String,
    },
    lastSyncAt: {
      type: Date,
    },
    centralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound index for finding user's emails in a central inbox
connectedEmailSchema.index({ userId: 1, centralInboxId: 1 });

connectedEmailSchema.plugin(toJSON);

export default mongoose.models.ConnectedEmail ||
  mongoose.model("ConnectedEmail", connectedEmailSchema);
