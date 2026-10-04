const express = require("express");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const { createClaim, myProperties, listClaims, decideClaim } = require("../controllers/claimController");

const router = express.Router();
router.post("/", auth, createClaim);
router.get("/my-properties", auth, myProperties);
router.get("/", auth, roleGuard("officer", "admin"), listClaims);
router.patch("/:id", auth, roleGuard("officer", "admin"), decideClaim);
module.exports = router;
