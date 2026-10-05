const test = require("node:test");
const assert = require("node:assert");
const { parseBbox } = require("../src/utils/bbox");
const { makeUlpin, isUlpin, formatUlpin, normalizeUlpin, escapeRegex } = require("../src/utils/ulpin");
const { retrieve, tokenize } = require("../src/utils/retrieval");

test("bbox validation", () => {
  assert.ok(parseBbox("80.2,13.0,80.3,13.1").ok);
  for (const bad of ["1,2,3", "a,b,c,d", "80.3,13.1,80.2,13.0", "-200,0,10,10", "70,10,80,20", ""]) assert.ok(!parseBbox(bad).ok, bad);
  const ok = parseBbox("80.2,13.0,80.3,13.1");
  assert.strictEqual(ok.polygon.coordinates[0].length, 5);
});

test("ulpin helpers", () => {
  const u = makeUlpin({ state: 4, district: 1, subdistrict: 1, village: 2, plot: 214 });
  assert.strictEqual(u, "04010010020214");
  assert.ok(isUlpin(u) && !isUlpin("04-01") && !isUlpin("0401001002021"));
  assert.strictEqual(formatUlpin(u), "04-01-001-002-0214");
  assert.strictEqual(normalizeUlpin("04-01-001-002-0214"), u);
  assert.strictEqual(normalizeUlpin(" 04 01 001 002 0214 "), u);
});

test("regex special characters are escaped", () => {
  const re = new RegExp(`^${escapeRegex("142/3.*(")}$`, "i");
  assert.ok(re.test("142/3.*("));
  assert.ok(!re.test("142/33333"));
});

const docs = [
  { lang: "en", title: "Consent and full report access", tags: ["consent", "report", "24"], text: "A buyer requests the full report. Approval lasts 24 hours." },
  { lang: "en", title: "Dues and receipts", tags: ["dues", "tax", "receipt"], text: "Payment is a simulation." },
  { lang: "ta", title: "நிலுவையும் ரசீதும்", tags: ["நிலுவை", "வரி", "ரசீது"], text: "செலுத்துதல் ஒரு உருவகம்." }
];
test("retrieval ranks by overlap and returns nothing for nonsense", () => {
  assert.strictEqual(retrieve("how long does consent last for a report", docs, "en")[0].title, "Consent and full report access");
  assert.deepStrictEqual(retrieve("xyzzy plugh", docs, "en"), []);
});
test("retrieval prefers the asked language and handles Tamil script", () => {
  assert.strictEqual(retrieve("எனது வரி நிலுவை", docs, "ta")[0].lang, "ta");
  assert.ok(tokenize("வரி நிலுவை").length === 2, "Indic combining marks stay inside words");
});
