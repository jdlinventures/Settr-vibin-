import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

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

const leadSchema = mongoose.Schema(
  {
    centralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    linkedIn: {
      type: String,
      trim: true,
    },
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      index: true,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto_detected", "csv_import"],
      default: "manual",
    },
    lastContactedAt: {
      type: Date,
    },
    lastRepliedAt: {
      type: Date,
    },
    isPositiveReply: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    notes: [noteSchema],
    emailThreadIds: [String],
    customFields: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Unique lead per email per inbox
leadSchema.index({ centralInboxId: 1, email: 1 }, { unique: true });
leadSchema.index({ centralInboxId: 1, stageId: 1 });
leadSchema.index({ centralInboxId: 1, followUpDate: 1 });
leadSchema.index(
  { email: "text", firstName: "text", lastName: "text", company: "text" },
  { weights: { email: 5, firstName: 3, lastName: 3, company: 2 } }
);

leadSchema.plugin(toJSON);

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
