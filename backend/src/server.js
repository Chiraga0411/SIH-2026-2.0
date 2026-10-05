require("dotenv").config();
const connectDB = require("./config/db");
const createApp = require("./app");

const secret = process.env.JWT_SECRET || "";
if (secret.length < 32) {
  console.error("JWT_SECRET is missing or shorter than 32 characters. Refusing to start.");
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}
const deliveryProblem = require("./utils/delivery").assertDeliveryConfig();
if (deliveryProblem) {
  console.error(`${deliveryProblem} Refusing to start.`);
  process.exit(1);
}

connectDB();

// Mark approved consents as EXPIRED every 5 minutes (reads also check expiry, so this only keeps data tidy).
if (process.env.NODE_ENV !== "test") {
  const { expireStale } = require("./utils/consent");
  setInterval(() => expireStale().catch((e) => console.error("Consent sweep failed:", e.message)), 5 * 60 * 1000).unref();
}

const PORT = process.env.PORT || 5000;
createApp().listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
