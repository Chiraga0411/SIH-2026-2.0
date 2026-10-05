const test = require("node:test");
const assert = require("node:assert");
const { ttlMs, isActive } = require("../src/utils/consent");

test("ttl defaults to 24 hours and follows CONSENT_TTL_HOURS", () => {
  delete process.env.CONSENT_TTL_HOURS;
  assert.strictEqual(ttlMs(), 24 * 3600 * 1000);
  process.env.CONSENT_TTL_HOURS = "0.01";
  assert.strictEqual(ttlMs(), 36000);
  process.env.CONSENT_TTL_HOURS = "abc";
  assert.strictEqual(ttlMs(), 24 * 3600 * 1000);
  delete process.env.CONSENT_TTL_HOURS;
});

test("consent is active until expiry, then not (fake clock)", () => {
  const t0 = new Date("2026-10-04T10:00:00Z");
  const c = { status: "APPROVED", expiresAt: new Date(t0.getTime() + 36000) };
  assert.ok(isActive(c, t0));
  assert.ok(isActive(c, new Date(t0.getTime() + 35999)));
  assert.ok(!isActive(c, new Date(t0.getTime() + 36000)), "just expired");
});

test("rejected, pending and expired consents are never active", () => {
  const future = new Date(Date.now() + 1e6);
  for (const status of ["REJECTED", "PENDING", "EXPIRED"]) assert.ok(!isActive({ status, expiresAt: future }));
  assert.ok(!isActive(null));
});
