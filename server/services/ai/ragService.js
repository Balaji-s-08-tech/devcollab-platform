const AIDocumentChunk = require("../../models/AIDocumentChunk");
const Document = require("../../models/Document");
const Project = require("../../models/Project");
const provider = require("./openaiProvider");

const extractText = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object") return [node.text, extractText(node.content)].filter(Boolean).join(" ");
  return "";
};

const chunkText = (text, maxChars = 1200, overlap = 180) => {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += maxChars - overlap) {
    chunks.push(clean.slice(i, i + maxChars));
  }
  return chunks.filter(Boolean);
};

const cosine = (a, b) => {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag) || 1);
};

const indexDocument = async (documentId) => {
  const doc = await Document.findById(documentId).lean();
  if (!doc) throw new Error("Document not found");
  const project = await Project.findById(doc.project).lean();
  const text = doc.contentText || extractText(doc.content);
  const chunks = chunkText(text);
  const embeddings = chunks.length ? await provider.embed(chunks) : [];

  await AIDocumentChunk.deleteMany({ document: doc._id });
  if (!chunks.length) return { chunks: 0 };

  await AIDocumentChunk.insertMany(
    chunks.map((chunk, index) => ({
      document: doc._id,
      project: doc.project,
      workspace: project?.workspace || null,
      organization: project?.organization || null,
      chunkIndex: index,
      text: chunk,
      embedding: embeddings[index],
      metadata: { title: doc.title },
    }))
  );

  return { chunks: chunks.length };
};

const retrieve = async ({ documentId, question, limit = 5 }) => {
  const [queryEmbedding] = await provider.embed([question]);
  const chunks = await AIDocumentChunk.find({ document: documentId }).lean();
  return chunks
    .map((chunk) => ({ ...chunk, score: cosine(queryEmbedding, chunk.embedding || []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const streamDocumentAnswer = async function* ({ documentId, question }) {
  let chunks = await retrieve({ documentId, question });
  if (!chunks.length) {
    await indexDocument(documentId);
    chunks = await retrieve({ documentId, question });
  }

  const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.text}`).join("\n\n");
  yield* provider.streamText({
    system: "You are DevCollab's document assistant. Answer only from the provided context. Cite chunk numbers when helpful.",
    prompt: `Context:\n${context}\n\nQuestion: ${question}`,
  });
};

module.exports = {
  indexDocument,
  retrieve,
  streamDocumentAnswer,
};
