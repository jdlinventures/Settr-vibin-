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

const noteSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const attachmentSchema = mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    // For Gmail attachments - used to fetch on demand
    gmailAttachmentId: {
      type: String,
    },
  },
  { _id: false }
);

const emailSchema = mongoose.Schema(
  {
    centralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
      required: true,
      index: true,
    },
    connectedEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedEmail",
      required: true,
      index: true,
    },
    // Gmail threadId or generated for SMTP emails
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    // Unique message ID from email headers
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    // For threading - In-Reply-To header
    inReplyTo: {
      type: String,
    },
    // For threading - References header
    references: [String],
    from: {
      type: emailParticipantSchema,
      required: true,
    },
    to: [emailParticipantSchema],
    cc: [emailParticipantSchema],
    subject: {
      type: String,
      trim: true,
    },
    bodyText: {
      type: String,
    },
    bodyHtml: {
      type: String,
    },
    receivedAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isWarmupFiltered: {
      type: Boolean,
      default: false,
      index: true,
    },
    // True if this email was sent by us (not received)
    isSent: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    notes: [noteSchema],
    attachments: [attachmentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound indexes for common queries
emailSchema.index({ centralInboxId: 1, receivedAt: -1 });
emailSchema.index({ centralInboxId: 1, isArchived: 1, receivedAt: -1 });
emailSchema.index({ centralInboxId: 1, threadId: 1 });
emailSchema.index({ centralInboxId: 1, isWarmupFiltered: 1 });

// Text index for search
emailSchema.index(
  {
    subject: "text",
    bodyText: "text",
    "from.email": "text",
    "from.name": "text",
  },
  {
    weights: {
      subject: 10,
      "from.email": 5,
      "from.name": 5,
      bodyText: 1,
    },
  }
);

emailSchema.plugin(toJSON);

export default mongoose.models.Email || mongoose.model("Email", emailSchema);
