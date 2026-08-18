const express = require("express");
const ctrl = require("../controllers/permissionController");

const router = express.Router();

router.get("/:token", ctrl.getSharedResource);

module.exports = router;
