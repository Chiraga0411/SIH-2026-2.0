const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Same token check as auth, but a missing or invalid token continues as anonymous (req.user undefined).
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.sub);
    if (user && user.isActive !== false) req.user = { id: String(user._id), role: user.role, name: user.name };
  } catch {
    // invalid or expired token: treat as anonymous
  }
  next();
};
module.exports = optionalAuth;
