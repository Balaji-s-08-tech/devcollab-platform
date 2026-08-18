const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const githubCtrl = require("../controllers/githubController");

router.get("/auth", authenticate, githubCtrl.oauthRedirect);
router.get("/callback", githubCtrl.oauthCallback);

router.use(authenticate);
router.get("/status", githubCtrl.getStatus);
router.delete("/disconnect", githubCtrl.disconnect);
router.get("/repos", githubCtrl.getRepos);
router.get("/repos/:owner/:repo/commits", githubCtrl.getRepoCommits);
router.get("/repos/:owner/:repo/issues", githubCtrl.getRepoIssues);
router.post("/repos/:owner/:repo/sync-issues", githubCtrl.syncIssues);

module.exports = router;
