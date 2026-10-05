// ULPIN layout (demo, see decision D2): state 2, district 2, sub-district 3, village 3, plot 4 = 14 characters.
const pad = (v, n) => String(v).toUpperCase().padStart(n, "0").slice(-n);
const isUlpin = (s) => typeof s === "string" && /^[0-9A-Z]{14}$/.test(s);
const makeUlpin = ({ state, district, subdistrict, village, plot }) =>
  pad(state, 2) + pad(district, 2) + pad(subdistrict, 3) + pad(village, 3) + pad(plot, 4);
// 04010010010214 -> 04-01-001-001-0214
const formatUlpin = (s) => (isUlpin(s) ? `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 7)}-${s.slice(7, 10)}-${s.slice(10)}` : s);
// Spaces and dashes removed, upper-cased: "04-01-001-001-0214" -> "04010010010214"
const normalizeUlpin = (s) => String(s || "").replace(/[\s-]/g, "").toUpperCase();
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
module.exports = { makeUlpin, isUlpin, formatUlpin, normalizeUlpin, escapeRegex };
