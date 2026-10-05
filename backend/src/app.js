const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const parcelRoutes = require("./routes/parcelRoutes");
const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const listingRoutes = require("./routes/listingRoutes");
const consentRoutes = require("./routes/consentRoutes");
const privacyRoutes = require("./routes/privacyRoutes");
const duesRoutes = require("./routes/duesRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const openapi = require("./openapi");
const workflowRoutes = require("./routes/workflowRoutes");

function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.disable("x-powered-by");

  const origins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean);
  app.use(helmet({ contentSecurityPolicy: false })); // API returns JSON; /docs loads Swagger from a CDN
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/parcels", parcelRoutes);
  app.use("/api/claims", claimRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/consents", consentRoutes);
  app.use("/api/privacy", privacyRoutes);
  app.use("/api/registrations", registrationRoutes);
  app.use("/api/dues", duesRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api", workflowRoutes);

app.get("/openapi.json", (req, res) => res.json(openapi));
app.get("/docs", (req, res) => res.type("html").send(`<!doctype html><html><head><title>LandStack Swagger</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script><script>window.onload=()=>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui'})</script></body></html>`));

  app.get("/", (req, res) => {
    res.json({ name: "LandStack API", status: "ok", version: "2.0.0", docs: "/docs", openapi: "/openapi.json" });
  });

  // Malformed JSON and other client errors keep their status; everything else is a generic 500.
  app.use((err, req, res, next) => {
    if (err && err.status && err.status < 500) return res.status(err.status).json({ message: "Invalid request" });
    console.error(err);
    res.status(500).json({ message: "Unexpected server error" });
  });

  return app;
}

module.exports = createApp;
