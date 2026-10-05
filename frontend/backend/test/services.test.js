const test = require("node:test");
const assert = require("node:assert");
const { SERVICES, getService, newRefId, initialSteps } = require("../src/utils/services");

test("eight services; request ones have a fee and a prefix", () => {
  assert.strictEqual(SERVICES.length, 8);
  for (const s of SERVICES.filter((x) => x.mode === "request")) assert.ok(s.fee > 0 && /^[A-Z]{3}$/.test(s.prefix));
});
test("reference ID matches the pattern the tracking box validates", () => {
  for (const s of SERVICES) assert.match(newRefId(s.prefix), /^[A-Z]{2,4}-\d{6}$/);
});
test("new request: step 0 done, step 1 in progress, SLA set", () => {
  const now = new Date("2026-10-04T00:00:00Z");
  const r = initialSteps(getService("land-use-certificate"), now);
  assert.deepStrictEqual(r.steps.map((s) => s.status), ["done", "in_progress", "pending", "pending"]);
  assert.strictEqual(r.currentStep, 1);
  assert.strictEqual(r.slaDueAt.getTime(), now.getTime() + 24 * 3600 * 1000);
});
