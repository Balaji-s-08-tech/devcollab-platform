const mongoose = require("mongoose");

const aiDocumentChunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

aiDocumentChunkSchema.index({ document: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.model("AIDocumentChunk", aiDocumentChunkSchema);
