const path = require("path");
const fs = require("fs");
const simpleGit = require("simple-git");
const logger = require("../config/logger");

const WORKSPACE_ROOT = path.resolve(process.env.GIT_WORKSPACE_PATH || "./workspace");

function ensureWorkspace() {
  if (!fs.existsSync(WORKSPACE_ROOT)) {
    fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
  }
}

function resolveRepoPath(userId, repoName) {
  return path.join(WORKSPACE_ROOT, String(userId), repoName);
}

function injectToken(url, token) {
  if (!token) return url;
  try {
    const parsed = new URL(url);
    parsed.username = "oauth2";
    parsed.password = token;
    return parsed.toString();
  } catch {
    return url;
  }
}

function getGit(repoPath) {
  return simpleGit(repoPath, {
    binary: "git",
    maxConcurrentProcesses: 4,
    trimmed: false,
  });
}

async function cloneRepo({ repoUrl, userId, repoName, token, branch = "main" }) {
  ensureWorkspace();
  const repoPath = resolveRepoPath(userId, repoName);

  if (fs.existsSync(repoPath)) {
    throw new Error(`Repository "${repoName}" already exists in this workspace.`);
  }

  const authUrl = injectToken(repoUrl, token);
  const git = simpleGit();

  logger.info(`[git] Cloning ${repoUrl} → ${repoPath}`);

  const options = branch ? ["--branch", branch, "--single-branch"] : [];
  await git.clone(authUrl, repoPath, options);

  logger.info(`[git] Clone complete: ${repoPath}`);
  return repoPath;
}

async function pullRepo({ userId, repoName, branch = "main", token, remoteName = "origin" }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);

  if (token) {
    const remoteUrl = await git.remote(["get-url", remoteName]);
    const authUrl = injectToken(remoteUrl.trim(), token);
    await git.remote(["set-url", remoteName, authUrl]);
  }

  const result = await git.pull(remoteName, branch);
  logger.info(`[git] Pull result: ${JSON.stringify(result.summary)}`);
  return result;
}

async function commitRepo({ userId, repoName, message, authorName, authorEmail }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);

  const options = {};
  if (authorName) options["--author"] = `"${authorName} <${authorEmail || "dev@devcollab.io"}>"`; 

  await git.add(".");
  const result = await git.commit(message, undefined, { "--author": `${authorName || "DevCollab"} <${authorEmail || "dev@devcollab.io"}>` });
  logger.info(`[git] Committed: ${result.commit}`);
  return result;
}

async function pushRepo({ userId, repoName, branch = "main", token, remoteName = "origin", force = false }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);

  if (token) {
    const remoteUrl = await git.remote(["get-url", remoteName]);
    const authUrl = injectToken(remoteUrl.trim(), token);
    await git.remote(["set-url", remoteName, authUrl]);
  }

  const pushOptions = force ? ["--force"] : [];
  const result = await git.push(remoteName, branch, pushOptions);
  logger.info(`[git] Pushed to ${remoteName}/${branch}`);
  return result;
}

async function getHistory({ userId, repoName, limit = 20, branch }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);
  const log = await git.log({ maxCount: limit, ...(branch ? { [branch]: null } : {}) });
  return log.all;
}

async function getStatus({ userId, repoName }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);
  const status = await git.status();
  return status;
}

async function getDiff({ userId, repoName, staged = false }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);
  const diff = staged ? await git.diff(["--cached"]) : await git.diff();
  return diff;
}

async function getBranches({ userId, repoName }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (!fs.existsSync(repoPath)) throw new Error("Repository not found in workspace");

  const git = getGit(repoPath);
  const branches = await git.branchLocal();
  return branches;
}

async function deleteRepo({ userId, repoName }) {
  const repoPath = resolveRepoPath(userId, repoName);
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
    logger.info(`[git] Deleted repo workspace: ${repoPath}`);
  }
}

module.exports = {
  resolveRepoPath,
  cloneRepo,
  pullRepo,
  commitRepo,
  pushRepo,
  getHistory,
  getStatus,
  getDiff,
  getBranches,
  deleteRepo,
};
