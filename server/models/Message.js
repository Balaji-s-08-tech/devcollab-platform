const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const attachmentSchema = new mongoose.Schema({
  name: String,
  url: String,
  type: String,
  size: Number,
});

const messageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [10000, "Message max 10000 chars"],
    },

    type: {
      type: String,
      enum: ["text", "code", "file", "system"],
      default: "text",
    },

    language: { type: String, default: null },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    reactions: [reactionSchema],
    attachments: [attachmentSchema],

    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    editedAt: { type: Date, default: null },
    editHistory: [
      {
        content: String,
        editedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
