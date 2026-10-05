process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.NODE_ENV = "test";
delete process.env.DISABLE_RATE_LIMIT;

const test = require("node:test");
const assert = require("node:assert/strict");
const fake = require("./fakeModels");
fake.install();
const createApp = require("../src/app");

test("SMS-sending endpoints are rate limited per account", async () => {
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const hit = () =>
    fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "9876511111", password: "Wrong1234" })
    }).then((r) => r.status);
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push(await hit());
  server.close();
  assert.ok(statuses.slice(0, 10).every((s) => s === 401), `first 10 allowed: ${statuses}`);
  assert.equal(statuses[10], 429, `11th blocked: ${statuses}`);
});
