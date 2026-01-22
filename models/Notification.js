import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const notificationSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["assignment", "mention", "invitation", "new_email"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
    },
    // Link to navigate to when notification is clicked
    link: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Optional reference to related entities
    relatedEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Email",
    },
    relatedCentralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Index for fetching unread notifications
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

notificationSchema.plugin(toJSON);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
