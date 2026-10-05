const test = require("node:test");
const assert = require("node:assert");
const { shapeParcel, shapeListing } = require("../src/utils/viewer");
const { restrictionResult } = require("../src/utils/services");

const parcel = {
  _id: "p1", owner: "u-owner", ulpin: "04010010010214", state: "Chandigarh", name: "Plot 1", zoning: "R", status: "sale",
  trustScore: 80, price: "50L", maskedOwner: "A K", geometry: { type: "Polygon", coordinates: [] },
  risks: { encroachmentSuspected: true }, floorsAllowed: 1, floorsBuilt: 3
};
const listing = { _id: "l1", owner: "u-owner", parcel: "p1", useType: "residential", price: 5000000, visibility: "public", zoningWarning: false, status: "LIVE", createdAt: new Date(0) };
const ownerUser = { name: "Asha Kumar", phone: "9000000000" };

test("listing response never contains the seller account id, for any viewer", () => {
  for (const viewer of [null, { id: "u2", role: "citizen" }, { id: "u-owner", role: "citizen" }, { id: "o1", role: "officer" }, { id: "a1", role: "admin" }]) {
    const out = shapeListing(listing, shapeParcel(parcel, viewer, { list: true }), viewer);
    assert.ok(!("owner" in out), "listing.owner leaked");
    assert.ok(!("owner" in out.parcel), "parcel.owner leaked");
    assert.ok(!JSON.stringify(out).includes("u-owner"), "owner id appears somewhere in the listing JSON");
  }
});
test("listing isMine is true only for the seller", () => {
  assert.strictEqual(shapeListing(listing, {}, { id: "u-owner", role: "citizen" }).isMine, true);
  assert.strictEqual(shapeListing(listing, {}, { id: "u2", role: "citizen" }).isMine, false);
  assert.strictEqual(shapeListing(listing, {}, null).isMine, false);
});
test("my-properties shape: owner sees own name and phone, but no risks, floors or account id", () => {
  for (const role of ["citizen", "registrar", "admin"]) {
    const out = shapeParcel(parcel, { id: "u-owner", role }, { ownerUser, noRisks: true });
    assert.strictEqual(out.ownerName, "Asha Kumar");
    assert.strictEqual(out.phone, "9000000000");
    for (const k of ["owner", "risks", "floorsAllowed", "floorsBuilt"]) assert.ok(!(k in out), `${k} leaked to ${role}`);
  }
});
test("staff still get risks on the normal parcel route (noRisks is opt-in)", () => {
  const out = shapeParcel(parcel, { id: "o1", role: "officer" }, {});
  assert.ok("risks" in out && "floorsBuilt" in out);
});
test("restriction check: citizens get clear only, staff also get flags", () => {
  const citizen = restrictionResult(parcel, false);
  assert.deepStrictEqual(citizen, { clear: false });
  assert.ok(!("flags" in citizen));
  assert.deepStrictEqual(restrictionResult(parcel, true).flags, parcel.risks);
});
