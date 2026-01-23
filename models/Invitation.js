import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const invitationSchema = mongoose.Schema(
  {
    // Email address of the person being invited
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // The central inbox they're being invited to
    centralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
      required: true,
    },
    // Role they'll have when they accept
    role: {
      type: String,
      enum: ["admin", "agent"],
      default: "agent",
    },
    // Who sent the invitation
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Status of the invitation
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending",
    },
    // When the invitation expires (7 days by default)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound index for finding pending invitations
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ centralInboxId: 1, status: 1 });

invitationSchema.plugin(toJSON);

export default mongoose.models.Invitation ||
  mongoose.model("Invitation", invitationSchema);
