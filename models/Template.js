import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const variableSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
    defaultValue: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const templateSchema = mongoose.Schema(
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
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    bodyHtml: {
      type: String,
      default: "",
    },
    variables: [variableSchema],
    category: {
      type: String,
      trim: true,
      default: "general",
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

templateSchema.index({ userId: 1, centralInboxId: 1 });
templateSchema.index({ userId: 1, category: 1 });

templateSchema.plugin(toJSON);

export default mongoose.models.Template ||
  mongoose.model("Template", templateSchema);
