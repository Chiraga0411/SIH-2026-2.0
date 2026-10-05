const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT, then loads the user so role changes and deactivation take effect immediately.
const auth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.sub);
    if (!user || user.isActive === false) return res.status(401).json({ message: "Invalid or expired token" });
    req.user = { id: String(user._id), role: user.role, name: user.name };
    next();
  } catch (error) {
    console.error(error);
    res.status(503).json({ message: "Service temporarily unavailable" });
  }
};

module.exports = auth;
