const maskName = (name) => String(name || "").trim().split(/\s+/).filter(Boolean).map((w) => w[0] + "••••").join(" ");
module.exports = { maskName };
