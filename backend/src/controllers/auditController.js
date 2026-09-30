const AuditLog = require("../models/AuditLog");
exports.getAuditLog = async (req, res) => { const limit = Math.min(Number(req.query.limit) || 100, 500); const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit).populate("actor", "name role").lean(); res.json({ count: logs.length, logs }); };
