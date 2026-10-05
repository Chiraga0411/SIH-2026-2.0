const test = require("node:test");
const assert = require("node:assert");
const { shapeParcel } = require("../src/utils/viewer");

const parcel = {
  _id: "p1", owner: "u-owner", ulpin: "04010010010214", state: "Chandigarh", name: "Plot 1", zoning: "R", status: "sale",
  trustScore: 80, price: "50L", maskedOwner: "A•••• K••••", geometry: { type: "Polygon", coordinates: [] },
  risks: { staleRecord: true }, floorsAllowed: 1, floorsBuilt: 3
};
const ownerUser = { name: "Asha Kumar", phone: "9000000000" };
const SECRET = ["owner", "phone", "risks", "floorsAllowed", "floorsBuilt", "ownerName"];
const noKeys = (o, keys) => keys.forEach((k) => assert.ok(!(k in o), `${k} leaked`));

test("anonymous gets public fields only", () => {
  const out = shapeParcel(parcel, null, {});
  noKeys(out, SECRET);
  assert.strictEqual(out.viewer.relation, "public");
  assert.strictEqual(out.maskedOwner, "A•••• K••••");
  assert.ok(out.hidden.includes("phone"));
});

test("citizen who is not the owner gets the same", () => {
  const out = shapeParcel(parcel, { id: "u2", role: "citizen" }, { ownerUser });
  noKeys(out, SECRET);
});

test("owner sees name and phone, never the account id or risks", () => {
  const out = shapeParcel(parcel, { id: "u-owner", role: "citizen" }, { ownerUser });
  assert.strictEqual(out.ownerName, "Asha Kumar");
  assert.strictEqual(out.phone, "9000000000");
  noKeys(out, ["owner", "risks"]);
  assert.strictEqual(out.viewer.relation, "owner");
});

test("officer sees risks and full owner details", () => {
  const out = shapeParcel(parcel, { id: "o1", role: "officer" }, { ownerUser });
  assert.strictEqual(out.floorsBuilt, 3);
  assert.ok(out.risks.staleRecord);
  assert.strictEqual(out.ownerName, "Asha Kumar");
  assert.ok(!("owner" in out));
});

test("admin and auditor see masked owner, no phone, but risks", () => {
  for (const role of ["admin", "auditor"]) {
    const out = shapeParcel(parcel, { id: "a1", role }, { ownerUser });
    assert.ok(!("ownerName" in out) && !("phone" in out));
    assert.strictEqual(out.maskedOwner, "A•••• K••••");
    assert.ok(out.risks);
    assert.strictEqual(out.viewer.relation, "oversight");
  }
});

test("owner privacy setting hidden removes the masked name too", () => {
  const out = shapeParcel(parcel, null, { privacy: { ownerName: "hidden" } });
  assert.ok(!("maskedOwner" in out));
  assert.ok(out.hidden.includes("ownerName"));
});

test("consent unlocks only fields set to on-consent", () => {
  const privacy = { ownerName: "consent", phone: "hidden" };
  const out = shapeParcel(parcel, { id: "u2", role: "citizen" }, { privacy, hasConsent: true, ownerUser });
  assert.strictEqual(out.ownerName, "Asha Kumar");
  assert.ok(!("phone" in out));
  assert.strictEqual(out.viewer.relation, "consented");
});
