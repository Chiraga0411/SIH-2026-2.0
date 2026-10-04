const express = require("express");
const auth = require("../middleware/auth");
const { getPrivacy, updatePrivacy } = require("../controllers/privacyController");

const router = express.Router();
router.get("/:ulpin", auth, getPrivacy);
router.put("/:ulpin", auth, updatePrivacy);
module.exports = router;
