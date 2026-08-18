const GitRepo = require("../models/GitRepo");
const gitService = require("../services/gitService");
const logger = require("../config/logger");

exports.cloneRepo = async (req, res, next) => {
  try {
    const { repoUrl, name, branch, token, projectId } = req.body;
    const userId = req.user._id;

    if (!repoUrl || !name) {
      return res.status(400).json({ success: false, message: "repoUrl and name are required" });
    }

    const existing = await GitRepo.findOne({ owner: userId, project: projectId, name });
    if (existing) {
      return res.status(409).json({ success: false, message: "A repo with this name already exists in the project" });
    }

    const localPath = `${userId}/${name}`;
    const record = await GitRepo.create({
      owner: userId,
      project: projectId,
      repoUrl,
      name,
      localPath,
      defaultBranch: branch || "main",
      currentBranch: branch || "main",
      authToken: token || null,
      cloneStatus: "cloning",
    });

    res.status(202).json({ success: true, message: "Clone started", repo: record });

    gitService
      .cloneRepo({ repoUrl, userId, repoName: name, token, branch })
      .then(async (repoPath) => {

        const history = await gitService.getHistory({ userId, repoName: name, limit: 1 });
        const lastCommit = history[0]
          ? { hash: history[0].hash, message: history[0].message, author: history[0].author_name, date: history[0].date }
          : null;

        await GitRepo.findByIdAndUpdate(record._id, {
          cloneStatus: "ready",
          lastSynced: new Date(),
          lastCommit,
        });
        logger.info(`[git] Clone completed for repo: ${name}`);
      })
      .catch(async (err) => {
        await GitRepo.findByIdAndUpdate(record._id, {
          cloneStatus: "error",
          cloneError: err.message,
        });
        logger.error(`[git] Clone failed for ${name}: ${err.message}`);
      });
  } catch (err) {
    next(err);
  }
};

exports.listRepos = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const query = { owner: req.user._id };
    if (projectId) query.project = projectId;

    const repos = await GitRepo.find(query).select("-authToken").sort({ updatedAt: -1 });
    res.json({ success: true, repos });
  } catch (err) {
    next(err);
  }
};

exports.getRepo = async (req, res, next) => {
  try {
    const repo = await GitRepo.findOne({ _id: req.params.id, owner: req.user._id }).select("-authToken");
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });
    res.json({ success: true, repo });
  } catch (err) {
    next(err);
  }
};

exports.pullRepo = async (req, res, next) => {
  try {
    const { repoId, branch } = req.body;
    const repo = await GitRepo.findOne({ _id: repoId, owner: req.user._id }).select("+authToken");
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    const result = await gitService.pullRepo({
      userId: req.user._id,
      repoName: repo.name,
      branch: branch || repo.currentBranch,
      token: repo.authToken,
    });

    await GitRepo.findByIdAndUpdate(repoId, { lastSynced: new Date() });

    const lines = Object.entries(result.summary)
      .map(([k, v]) => `${k}: ${v}`)
      .concat(result.files.map((f) => `  ${f}`));

    res.json({ success: true, message: "Pull complete", lines, result });
  } catch (err) {
    next(err);
  }
};

exports.commitRepo = async (req, res, next) => {
  try {
    const { repoId, message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Commit message is required" });

    const repo = await GitRepo.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    const result = await gitService.commitRepo({
      userId: req.user._id,
      repoName: repo.name,
      message,
      authorName: req.user.name,
      authorEmail: req.user.email,
    });

    await GitRepo.findByIdAndUpdate(repoId, {
      lastCommit: {
        hash: result.commit,
        message,
        author: req.user.name,
        date: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Committed successfully",
      commit: result.commit,
      summary: result.summary,
      lines: [`✔ ${result.summary.changes} changes committed: ${result.commit}`],
    });
  } catch (err) {
    next(err);
  }
};

exports.pushRepo = async (req, res, next) => {
  try {
    const { repoId, branch, force } = req.body;
    const repo = await GitRepo.findOne({ _id: repoId, owner: req.user._id }).select("+authToken");
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    await gitService.pushRepo({
      userId: req.user._id,
      repoName: repo.name,
      branch: branch || repo.currentBranch,
      token: repo.authToken,
      force: !!force,
    });

    res.json({ success: true, message: "Push successful", lines: ["✔ Changes pushed to remote"] });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { repoId, limit = 20 } = req.query;
    const repo = await GitRepo.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    const commits = await gitService.getHistory({
      userId: req.user._id,
      repoName: repo.name,
      limit: parseInt(limit),
    });

    res.json({ success: true, commits });
  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const { repoId } = req.query;
    const repo = await GitRepo.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    const status = await gitService.getStatus({ userId: req.user._id, repoName: repo.name });
    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
};

exports.getDiff = async (req, res, next) => {
  try {
    const { repoId, staged } = req.query;
    const repo = await GitRepo.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    const diff = await gitService.getDiff({
      userId: req.user._id,
      repoName: repo.name,
      staged: staged === "true",
    });

    res.json({ success: true, diff });
  } catch (err) {
    next(err);
  }
};

exports.deleteRepo = async (req, res, next) => {
  try {
    const repo = await GitRepo.findOne({ _id: req.params.id, owner: req.user._id });
    if (!repo) return res.status(404).json({ success: false, message: "Repo not found" });

    await gitService.deleteRepo({ userId: req.user._id, repoName: repo.name });
    await GitRepo.findByIdAndDelete(repo._id);

    res.json({ success: true, message: "Repository removed from workspace" });
  } catch (err) {
    next(err);
  }
};
