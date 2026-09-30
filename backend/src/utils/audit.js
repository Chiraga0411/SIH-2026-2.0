const AuditLog = require("../models/AuditLog");
function audit(req, action, details = {}) {
  const payload = { actor: req.user?.id, actorName: req.user?.name, role: req.user?.role, action, ip: req.ip, ...details };
  return AuditLog.create(payload).catch(error => console.error("Audit log failed:", error.message));
}
module.exports = audit;
