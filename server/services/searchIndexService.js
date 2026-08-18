const Document = require("../models/Document");
const Issue = require("../models/Issue");
const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { getMeiliClient, SEARCH_INDEX, initSearchIndex } = require("../config/meilisearch");
const logger = require("../config/logger");

const indexingDisabled = () => process.env.NODE_ENV === "test" || process.env.SEARCH_INDEXING_DISABLED === "true";

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || null;

const extractText = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object") {
    return [node.text, extractText(node.content)].filter(Boolean).join(" ");
  }
  return "";
};

const loadProjectContext = async (projectId) => {
  if (!projectId) return {};
  const project = await Project.findById(projectId).select("workspace organization").lean();
  return {
    projectId: toId(projectId),
    workspaceId: toId(project?.workspace),
    organizationId: toId(project?.organization),
  };
};

const index = async () => (await getMeiliClient()).index(SEARCH_INDEX);

const upsertSearchDocuments = async (docs) => {
  if (!docs.length || indexingDisabled()) return;
  try {
    await initSearchIndex();
    const meiliIndex = await index();
    await meiliIndex.addDocuments(docs);
  } catch (err) {
    logger.warn(`Search indexing skipped: ${err.message}`);
  }
};

const deleteSearchDocuments = async (ids) => {
  if (!ids.length || indexingDisabled()) return;
  try {
    const meiliIndex = await index();
    await meiliIndex.deleteDocuments(ids);
  } catch (err) {
    logger.warn(`Search delete skipped: ${err.message}`);
  }
};

const documentRecord = async (doc) => {
  const plain = doc.contentText || extractText(doc.content);
  return {
    id: `document:${doc._id}`,
    type: "document",
    resourceId: toId(doc._id),
    title: doc.title,
    content: plain,
    projectId: toId(doc.project),
    ...(await loadProjectContext(doc.project)),
    authorId: toId(doc.author),
    status: doc.isArchived ? "archived" : "active",
    labels: doc.tags || [],
    createdAt: doc.createdAt?.toISOString?.(),
    updatedAt: doc.updatedAt?.toISOString?.(),
    url: `/projects/${doc.project}/docs/${doc._id}`,
  };
};

const documentCommentRecords = async (doc) => {
  const context = await loadProjectContext(doc.project);
  return (doc.comments || []).map((comment) => ({
    id: `comment:document:${doc._id}:${comment._id}`,
    type: "comment",
    resourceId: toId(comment._id),
    parentType: "document",
    parentId: toId(doc._id),
    title: doc.title,
    comment: comment.content,
    projectId: toId(doc.project),
    ...context,
    authorId: toId(comment.author),
    createdAt: comment.createdAt?.toISOString?.(),
    updatedAt: comment.updatedAt?.toISOString?.(),
    url: `/projects/${doc.project}/docs/${doc._id}`,
  }));
};

const issueRecord = async (issue) => ({
  id: `issue:${issue._id}`,
  type: "issue",
  resourceId: toId(issue._id),
  title: issue.title,
  body: issue.body || "",
  projectId: toId(issue.project),
  ...(await loadProjectContext(issue.project)),
  authorId: toId(issue.author),
  assigneeIds: (issue.assignees || []).map(toId),
  status: issue.state,
  priority: issue.priority,
  labels: (issue.labels || []).map((label) => label.name),
  createdAt: issue.createdAt?.toISOString?.(),
  updatedAt: issue.updatedAt?.toISOString?.(),
  url: `/projects/${issue.project}/issues/${issue._id}`,
});

const issueCommentRecords = async (issue) => {
  const context = await loadProjectContext(issue.project);
  return (issue.comments || []).map((comment) => ({
    id: `comment:issue:${issue._id}:${comment._id}`,
    type: "comment",
    resourceId: toId(comment._id),
    parentType: "issue",
    parentId: toId(issue._id),
    title: issue.title,
    comment: comment.content,
    projectId: toId(issue.project),
    ...context,
    authorId: toId(comment.author),
    createdAt: comment.createdAt?.toISOString?.(),
    updatedAt: comment.updatedAt?.toISOString?.(),
    url: `/projects/${issue.project}/issues/${issue._id}`,
  }));
};

const taskRecord = async (task) => ({
  id: `board:${task._id}`,
  type: "board",
  resourceId: toId(task._id),
  title: task.title,
  body: task.description || "",
  projectId: toId(task.project),
  ...(await loadProjectContext(task.project)),
  authorId: toId(task.author),
  assigneeIds: (task.assignees || []).map(toId),
  status: task.status,
  priority: task.priority,
  labels: (task.labels || []).map((label) => label.name),
  createdAt: task.createdAt?.toISOString?.(),
  updatedAt: task.updatedAt?.toISOString?.(),
  url: `/projects/${task.project}/board?task=${task._id}`,
});

const userRecord = (user) => ({
  id: `user:${user._id}`,
  type: "user",
  resourceId: toId(user._id),
  name: user.name,
  email: user.email,
  title: user.name,
  body: [user.email, user.githubUsername, user.bio].filter(Boolean).join(" "),
  status: user.isOnline ? "online" : "offline",
  createdAt: user.createdAt?.toISOString?.(),
  updatedAt: user.updatedAt?.toISOString?.(),
  url: `/users/${user._id}`,
});

const indexDocument = async (docId) => {
  const doc = await Document.findById(docId).lean();
  if (!doc) return deleteSearchDocuments([`document:${docId}`]);
  const records = [await documentRecord(doc), ...(await documentCommentRecords(doc))];
  await upsertSearchDocuments(records);
};

const indexIssue = async (issueId) => {
  const issue = await Issue.findById(issueId).lean();
  if (!issue) return deleteSearchDocuments([`issue:${issueId}`]);
  await upsertSearchDocuments([await issueRecord(issue), ...(await issueCommentRecords(issue))]);
};

const indexTask = async (taskId) => {
  const task = await Task.findById(taskId).lean();
  if (!task) return deleteSearchDocuments([`board:${taskId}`]);
  await upsertSearchDocuments([await taskRecord(task)]);
};

const indexUser = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) return deleteSearchDocuments([`user:${userId}`]);
  await upsertSearchDocuments([userRecord(user)]);
};

const reindexAll = async () => {
  await initSearchIndex();
  const meiliIndex = await index();
  await meiliIndex.deleteAllDocuments().catch(() => {});

  for await (const doc of Document.find().cursor()) await indexDocument(doc._id);
  for await (const issue of Issue.find().cursor()) await indexIssue(issue._id);
  for await (const task of Task.find().cursor()) await indexTask(task._id);
  for await (const user of User.find().cursor()) await indexUser(user._id);
};

const search = async ({ q, filters = [], facets = [], page = 1, limit = 10 }) => {
  await initSearchIndex();
  const meiliIndex = await index();
  return meiliIndex.search(q || "", {
    filter: filters.filter(Boolean),
    facets,
    page: Number(page),
    hitsPerPage: Number(limit),
    attributesToHighlight: ["title", "body", "content", "comment", "name"],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
    sort: ["updatedAt:desc"],
  });
};

module.exports = {
  deleteSearchDocuments,
  indexDocument,
  indexIssue,
  indexTask,
  indexUser,
  reindexAll,
  search,
};
