// bbox=minLng,minLat,maxLng,maxLat. Returns { ok, polygon } or { ok:false, message }.
function parseBbox(raw, maxSpan = 2) {
  const parts = String(raw).split(",").map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return { ok: false, message: "bbox must be four numbers: minLng,minLat,maxLng,maxLat" };
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return { ok: false, message: "bbox is outside valid longitude or latitude ranges" };
  if (!(minLng < maxLng && minLat < maxLat)) return { ok: false, message: "bbox min values must be less than max values" };
  if (maxLng - minLng > maxSpan || maxLat - minLat > maxSpan) return { ok: false, message: `bbox is too large (max ${maxSpan} degrees on each side)` };
  return { ok: true, polygon: { type: "Polygon", coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]] } };
}
module.exports = { parseBbox };
