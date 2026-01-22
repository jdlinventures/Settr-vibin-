import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const tagSchema = mongoose.Schema(
  {
    centralInboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CentralInbox",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "#6366f1", // indigo-500
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Ensure unique tag names within a central inbox
tagSchema.index({ centralInboxId: 1, name: 1 }, { unique: true });

tagSchema.plugin(toJSON);

export default mongoose.models.Tag || mongoose.model("Tag", tagSchema);
