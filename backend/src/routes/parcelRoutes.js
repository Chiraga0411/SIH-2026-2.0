const express = require("express");

const {
  getParcels,
  getParcelByUlpIN
} = require("../controllers/parcelController");

const router = express.Router();

router.get("/", getParcels);

router.get("/:ulpin", getParcelByUlpIN);

module.exports = router;