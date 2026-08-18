const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = () => process.env.AI_MODEL || "gpt-4o";
const embeddingModel = () => process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small";

const textFromResponse = (response) => {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .join("");
};

const generateText = async ({ system, prompt, temperature = 0.2 }) => {
  const response = await client.responses.create({
    model: model(),
    temperature,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return textFromResponse(response);
};

const generateJson = async ({ system, prompt, schemaName = "result" }) => {
  const response = await client.responses.create({
    model: model(),
    input: [
      { role: "system", content: `${system}\nReturn only valid JSON.` },
      { role: "user", content: prompt },
    ],
    text: {
      format: { type: "json_object", name: schemaName },
    },
  });
  return JSON.parse(textFromResponse(response));
};

const streamText = async function* ({ system, prompt, temperature = 0.2 }) {
  const stream = await client.responses.create({
    model: model(),
    temperature,
    stream: true,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  for await (const event of stream) {
    const delta = event.delta || event.text || event.output_text;
    if (event.type?.includes("delta") && delta) yield delta;
  }
};

const embed = async (input) => {
  const response = await client.embeddings.create({
    model: embeddingModel(),
    input,
  });
  return response.data.map((item) => item.embedding);
};

module.exports = {
  embed,
  generateJson,
  generateText,
  streamText,
};
