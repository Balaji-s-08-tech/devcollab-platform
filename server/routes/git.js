const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const gitCtrl = require("../controllers/gitController");

router.use(authenticate);

router.get("/repos", gitCtrl.listRepos);
router.get("/repos/:id", gitCtrl.getRepo);
router.delete("/repos/:id", gitCtrl.deleteRepo);

router.post("/clone", gitCtrl.cloneRepo);
router.post("/pull", gitCtrl.pullRepo);
router.post("/commit", gitCtrl.commitRepo);
router.post("/push", gitCtrl.pushRepo);

router.get("/history", gitCtrl.getHistory);
router.get("/status", gitCtrl.getStatus);
router.get("/diff", gitCtrl.getDiff);

module.exports = router;
