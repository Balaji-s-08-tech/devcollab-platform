const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    name: {
      type: String,
      required: [true, "Channel name is required"],
      trim: true,
      maxlength: [80, "Channel name max 80 chars"],
    },

    type: {
      type: String,
      enum: ["public", "private", "dm"],
      default: "public",
    },
    description: {
      type: String,
      maxlength: 300,
      default: "",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      content: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: Date,
    },

    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

channelSchema.index({ project: 1, type: 1 });
channelSchema.index({ members: 1 });

module.exports = mongoose.model("Channel", channelSchema);
