const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

// GET /api/audit-log  (admin, auditor)
exports.getAuditLog = async (req, res) => {
  try {
    const { action, role, actor, ulpin, from, to } = req.query;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    const filter = {};
    if (action) filter.action = String(action);
    if (role) filter.role = String(role);
    if (ulpin) filter.ulpin = String(ulpin);
    if (actor) {
      if (!mongoose.isValidObjectId(actor)) return res.status(400).json({ message: "actor must be a user id" });
      filter.actor = actor;
    }
    if (from || to) {
      filter.createdAt = {};
      for (const [key, op] of [[from, "$gte"], [to, "$lte"]]) {
        if (!key) continue;
        const d = new Date(key);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "from and to must be ISO dates" });
        filter.createdAt[op] = d;
      }
    }
    const [total, rows] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);
    const logs = rows.map((r) => ({ ...r, actorName: r.actorName || null, role: r.role || null }));
    res.json({ total, page, limit, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch audit log" });
  }
};
