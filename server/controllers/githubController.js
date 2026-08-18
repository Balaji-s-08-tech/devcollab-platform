const User = require("../models/User");
const Issue = require("../models/Issue");
const githubService = require("../services/githubService");
const logger = require("../config/logger");

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || "http://localhost:3443/api/github/callback";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

exports.oauthRedirect = (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(503).json({ success: false, message: "GitHub OAuth not configured. Add GITHUB_CLIENT_ID to .env" });
  }
  const scope = "read:user,repo";
  const state = req.user ? String(req.user._id) : "anon";
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}&scope=${scope}&state=${state}`;
  res.redirect(url);
};

exports.oauthCallback = async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) return res.redirect(`${CLIENT_URL}/github?error=no_code`);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      logger.error(`[github] OAuth token exchange failed: ${tokenData.error_description}`);
      return res.redirect(`${CLIENT_URL}/github?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    const ghUser = await githubService.getAuthUser(accessToken);

    let user;
    if (userId && userId !== "anon") {
      user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            githubId: String(ghUser.id),
            githubAccessToken: accessToken,
            githubUsername: ghUser.login,
            githubProfile: {
              login: ghUser.login,
              avatarUrl: ghUser.avatar_url,
              htmlUrl: ghUser.html_url,
              name: ghUser.name,
            },
          },
        },
        { new: true }
      );
    }

    logger.info(`[github] OAuth complete for user: ${ghUser.login}`);

    res.redirect(`${CLIENT_URL}/github?connected=true`);
  } catch (err) {
    logger.error(`[github] Callback error: ${err.message}`);
    res.redirect(`${CLIENT_URL}/github?error=server_error`);
  }
};

exports.getRepos = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(401).json({ success: false, message: "GitHub not connected. Please authorize via /api/github/auth" });
    }

    const { page = 1, perPage = 30, sort = "updated" } = req.query;
    const repos = await githubService.getUserRepos(user.githubAccessToken, { page, perPage, sort });

    res.json({ success: true, repos });
  } catch (err) {
    next(err);
  }
};

exports.getRepoCommits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(401).json({ success: false, message: "GitHub not connected" });
    }

    const { owner, repo } = req.params;
    const { per_page = 20, page = 1 } = req.query;
    const commits = await githubService.getRepoCommits(user.githubAccessToken, owner, repo, { per_page, page });

    res.json({ success: true, commits });
  } catch (err) {
    next(err);
  }
};

exports.getRepoIssues = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(401).json({ success: false, message: "GitHub not connected" });
    }

    const { owner, repo } = req.params;
    const { state = "open", per_page = 20, page = 1 } = req.query;
    const issues = await githubService.getRepoIssues(user.githubAccessToken, owner, repo, { state, per_page, page });

    res.json({ success: true, issues });
  } catch (err) {
    next(err);
  }
};

exports.syncIssues = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(401).json({ success: false, message: "GitHub not connected" });
    }

    const { owner, repo } = req.params;
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: "projectId required" });

    const ghIssues = await githubService.getRepoIssues(user.githubAccessToken, owner, repo, { state: "open", per_page: 50 });

    let created = 0;
    for (const gi of ghIssues) {
      if (gi.pull_request) continue;
      const exists = await Issue.findOne({ project: projectId, githubId: gi.id });
      if (!exists) {
        await Issue.create({
          title: gi.title,
          body: gi.body || "",
          project: projectId,
          author: req.user._id,
          status: "open",
          githubId: gi.id,
          githubUrl: gi.html_url,
          labels: gi.labels.map((l) => ({ name: l.name, color: `#${l.color}` })),
        });
        created++;
      }
    }

    res.json({ success: true, synced: created, message: `${created} new issues imported` });
  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    const connected = !!(user?.githubAccessToken);
    res.json({
      success: true,
      connected,
      username: user?.githubUsername || null,
      profile: user?.githubProfile || null,
    });
  } catch (err) {
    next(err);
  }
};

exports.disconnect = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { githubAccessToken: 1, githubId: 1, githubProfile: 1 },
    });
    res.json({ success: true, message: "GitHub disconnected" });
  } catch (err) {
    next(err);
  }
};
