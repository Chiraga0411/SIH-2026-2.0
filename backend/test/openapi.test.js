const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const openapi = require("../src/openapi");

// Every route declared in the route files must appear in the OpenAPI document.
const MOUNTS = { authRoutes: "/auth", parcelRoutes: "/parcels", claimRoutes: "/claims", listingRoutes: "/listings", consentRoutes: "/consents", privacyRoutes: "/privacy", registrationRoutes: "/registrations", duesRoutes: "/dues", assistantRoutes: "/assistant", workflowRoutes: "" };
test("openapi covers every route", () => {
  const missing = [];
  for (const [file, mount] of Object.entries(MOUNTS)) {
    const src = fs.readFileSync(path.join(__dirname, "../src/routes", file + ".js"), "utf8");
    for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g)) {
      const p = (mount + (m[2] === "/" ? "" : m[2])).replace(/:(\w+)/g, "{$1}") || "/";
      if (!openapi.paths[p] || !openapi.paths[p][m[1]]) missing.push(`${m[1].toUpperCase()} ${p}`);
    }
  }
  assert.deepStrictEqual(missing, []);
});
