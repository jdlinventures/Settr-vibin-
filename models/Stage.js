import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const stageSchema = mongoose.Schema(
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
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Index for ordering stages within a central inbox
stageSchema.index({ centralInboxId: 1, order: 1 });

stageSchema.plugin(toJSON);

export default mongoose.models.Stage || mongoose.model("Stage", stageSchema);
