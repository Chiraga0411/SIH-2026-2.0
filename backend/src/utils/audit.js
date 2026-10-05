const AuditLog = require("../models/AuditLog");

// audit(req, action, details, { session })
// With a session: written inside the transaction and errors propagate, so a failed audit aborts the change.
// Without: best effort, errors are logged and swallowed.
function audit(req, action, details = {}, { session } = {}) {
  const payload = {
    actor: req.user?.id,
    actorName: req.user?.name,
    role: req.user?.role,
    action,
    ip: req.ip,
    ...details
  };
  if (session) return AuditLog.create([payload], { session });
  return AuditLog.create(payload).catch((error) => console.error("Audit log failed:", error.message));
}
module.exports = audit;
