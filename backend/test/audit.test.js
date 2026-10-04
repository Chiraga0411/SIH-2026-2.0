const test = require("node:test");
const assert = require("node:assert");
const AuditLog = require("../src/models/AuditLog");

test("audit log blocks updates and deletes", async () => {
  await assert.rejects(() => AuditLog.updateOne({}, { action: "x" }).exec(), /append-only/);
  await assert.rejects(() => AuditLog.deleteMany({}).exec(), /append-only/);
  await assert.rejects(() => AuditLog.findOneAndUpdate({}, { action: "x" }).exec(), /append-only/);
});
