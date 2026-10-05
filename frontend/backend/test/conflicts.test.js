const test = require("node:test");
const assert = require("node:assert");
const { findConflicts } = require("../src/controllers/conflictController");

const base = { ulpin: "04010010010001", name: "Plot 1", state: "Chandigarh", floorsAllowed: 3, floorsBuilt: 1 };
test("area mismatch above 5 percent is flagged with evidence; high above 10", () => {
  const out = findConflicts([
    { ...base, ulpin: "A", registeredAreaSqYd: 168, rorAreaSqYd: 150 },
    { ...base, ulpin: "B", registeredAreaSqYd: 160, rorAreaSqYd: 150 },
    { ...base, ulpin: "C", registeredAreaSqYd: 152, rorAreaSqYd: 150 }
  ], []);
  assert.strictEqual(out.length, 2);
  const a = out.find((x) => x.ulpin === "A");
  assert.strictEqual(a.severity, "high");
  assert.deepStrictEqual(a.evidence, { registered: 168, ror: 150, diffPct: 12 });
  assert.strictEqual(out.find((x) => x.ulpin === "B").severity, "medium");
  assert.match(a.wording, /needs officer review/);
});
test("fixing the RoR area removes the conflict", () => {
  assert.strictEqual(findConflicts([{ ...base, registeredAreaSqYd: 168, rorAreaSqYd: 168 }], []).length, 0);
});
test("listing rules", () => {
  const listings = [
    { _id: "l1", parcel: { ...base, ulpin: "M", status: "mort" } },
    { _id: "l2", zoningWarning: true, useType: "commercial", parcel: { ...base, ulpin: "Z", status: "sale", zoning: "R" } },
    { _id: "l3", parcel: { ...base, ulpin: "OK", status: "sale" } }
  ];
  const rules = findConflicts([], listings).map((x) => x.ruleId).sort();
  assert.deepStrictEqual(rules, ["LISTED_WHILE_ENCUMBERED", "USE_ZONING_MISMATCH"]);
});
test("floors over permit", () => {
  assert.strictEqual(findConflicts([{ ...base, floorsBuilt: 3, floorsAllowed: 1 }], [])[0].ruleId, "FLOORS_OVER_PERMIT");
});
