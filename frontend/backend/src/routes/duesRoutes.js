const express = require("express");
const auth = require("../middleware/auth");
const { listDues, payDue } = require("../controllers/duesController");
const router = express.Router();
router.get("/", auth, listDues);
router.post("/:id/pay", auth, payDue);
module.exports = router;
