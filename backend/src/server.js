const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const parcelRoutes = require("./routes/parcelRoutes");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const listingRoutes = require("./routes/listingRoutes");
const consentRoutes = require("./routes/consentRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
dotenv.config();

const app = express();

// Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/parcels", parcelRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/consents", consentRoutes);
app.use("/api/registrations", registrationRoutes);
// Health check
app.get("/", (req, res) => {
  res.json({
    name: "LandStack API",
    status: "ok",
    version: "1.0.0",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
