const express = require("express");

const {
  sendOtp,
  verifyOtp,
  officialLogin
} = require("../controllers/authController");

const router = express.Router();

router.post("/send-otp", sendOtp);

router.post("/verify-otp", verifyOtp);

router.post("/official-login", officialLogin);

module.exports = router;