const logger = require("./logger");

let client;
let clientPromise;

const getMeiliClient = async () => {
  if (client) return client;
  if (!clientPromise) {
    clientPromise = import("meilisearch").then(({ MeiliSearch }) => new MeiliSearch({
      host: process.env.MEILI_HOST || "http://localhost:7700",
      apiKey: process.env.MEILI_MASTER_KEY || process.env.MEILI_SEARCH_KEY,
    }));
  }
  client = await clientPromise;
  return client;
};

const SEARCH_INDEX = process.env.MEILI_INDEX || "devcollab";

const indexSettings = {
  searchableAttributes: ["title", "body", "content", "name", "email", "comment"],
  displayedAttributes: ["*"],
  filterableAttributes: [
    "type",
    "organizationId",
    "workspaceId",
    "projectId",
    "resourceId",
    "assigneeIds",
    "authorId",
    "status",
    "priority",
    "labels",
    "createdAt",
    "updatedAt",
  ],
  sortableAttributes: ["createdAt", "updatedAt"],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
  },
};

const initSearchIndex = async () => {
  const meili = await getMeiliClient();
  try {
    await meili.createIndex(SEARCH_INDEX, { primaryKey: "id" }).catch(() => {});
    const index = meili.index(SEARCH_INDEX);
    await index.updateSettings(indexSettings);
    logger.info(`Meilisearch index ready: ${SEARCH_INDEX}`);
    return index;
  } catch (err) {
    logger.warn(`Meilisearch unavailable: ${err.message}`);
    return null;
  }
};

module.exports = {
  SEARCH_INDEX,
  getMeiliClient,
  indexSettings,
  initSearchIndex,
};
