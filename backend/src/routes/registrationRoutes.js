const express = require("express");

const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
  createRegistration,
  getRegistrationQueue,
  updateRegistration
} = require("../controllers/registrationController");

const router = express.Router();


// Buyer submits registration
router.post(
  "/",
  auth,
  createRegistration
);


// Registrar sees queue
router.get("/", auth, getRegistrationQueue); // registrar/admin queue, or ?mine=1 for the buyer


// Registrar approves/rejects
router.patch(
  "/:id",
  auth,
  roleGuard("registrar", "admin"),
  updateRegistration
);

module.exports = router;