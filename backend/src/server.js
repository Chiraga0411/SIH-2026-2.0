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
const workflowRoutes = require("./routes/workflowRoutes");
dotenv.config();

const app = express();

// Database
connectDB();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",") : true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/parcels", parcelRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/consents", consentRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api", workflowRoutes);

const openapi = {
  openapi: "3.0.3",
  info: { title: "LandStack API", version: "1.1.0", description: "Verified land records, consent, services and audit APIs." },
  servers: [{ url: "/api" }],
  security: [{ bearerAuth: [] }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  paths: {
    "/auth/send-otp": { post: { security: [], summary: "Send demo OTP" } },
    "/auth/verify-otp": { post: { security: [], summary: "Verify citizen OTP" } },
    "/parcels": { get: { summary: "List parcels" } },
    "/parcels/{ulpin}": { get: { summary: "Get parcel" } },
    "/claims": { post: { summary: "Claim a parcel" } },
    "/alerts": { get: { summary: "List role-scoped risk alerts" } },
    "/audit-log": { get: { summary: "List audit events" } },
    "/services": { get: { summary: "List eight land services" } },
    "/services/{id}": { get: { summary: "Run an instant service check" } },
    "/service-requests": { get: { summary: "List service requests" }, post: { summary: "Create certificate request" } },
    "/service-requests/{id}": { patch: { summary: "Approve or reject service request" } },
    "/service-requests/{id}/certificate": { get: { summary: "Download issued certificate" } }
  }
};
app.get("/openapi.json", (req, res) => res.json(openapi));
app.get("/docs", (req, res) => res.type("html").send(`<!doctype html><html><head><title>LandStack Swagger</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>window.onload=()=>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui'})</script></body></html>`));
// Health check
app.get("/", (req, res) => {
  res.json({
    name: "LandStack API",
    status: "ok",
    version: "1.1.0",
    docs: "/docs",
    openapi: "/openapi.json",
  });
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: "Unexpected server error" }); });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
