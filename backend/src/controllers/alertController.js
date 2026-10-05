const Parcel = require("../models/Parcel");
const audit = require("../utils/audit");
exports.getAlerts = async (req, res) => {
  const parcels = await Parcel.find({ $or: [{ "risks.encroachmentSuspected": true }, { "risks.staleRecord": true }, { "risks.dataMismatch": true }, { $expr: { $gt: ["$floorsBuilt", "$floorsAllowed"] } }] }).select("ulpin state district name risks floorsAllowed floorsBuilt trustScore").lean();
  const alerts = parcels.flatMap(p => { const out=[]; if (p.risks?.encroachmentSuspected) out.push({ type:"encroachment_suspected", severity:"high", wording:"Encroachment suspected; needs officer review" }); if (p.risks?.staleRecord) out.push({ type:"stale_record", severity:"medium", wording:"Record is stale; verification needed" }); if (p.risks?.dataMismatch) out.push({ type:"data_mismatch", severity:"high", wording:"Data mismatch across sources; needs review" }); if (p.floorsBuilt > p.floorsAllowed) out.push({ type:"change_detection", severity:"high", wording:`Suspected change: ${p.floorsBuilt} floors observed vs ${p.floorsAllowed} permitted` }); return out.map(a => ({ ...a, ulpin:p.ulpin, state:p.state, district:p.district, parcelName:p.name })); });
  await audit(req, "ALERTS_VIEWED", { resourceType: "Alert", metadata: { count: alerts.length } }); res.json({ count: alerts.length, alerts });
};
