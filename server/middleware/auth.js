const { verifyAccessToken } = require("../utils/jwt");
const { sendUnauthorized } = require("../utils/apiResponse");
const User = require("../models/User");

/**
 * protect — verify JWT and attach req.user
 *
 * Accepts the token from:
 *   1. Authorization: Bearer <token>   (primary — SPA / mobile)
 *   2. x-access-token header           (fallback)
 */
const protect = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    }

    if (!token) {
      return sendUnauthorized(res, "No token provided. Please log in.");
    }

    // Verify signature + expiry
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return sendUnauthorized(res, "Session expired. Please refresh your token.");
      }
      return sendUnauthorized(res, "Invalid token. Please log in again.");
    }

    // Fetch user — ensures account still exists and is active
    const user = await User.findById(decoded.sub).select(
      "name email role isActive organizerProfile isVerified"
    );

    if (!user) {
      return sendUnauthorized(res, "Account not found. Please log in again.");
    }

    if (!user.isActive) {
      return sendUnauthorized(res, "Account has been deactivated.");
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("[auth.protect] unexpected error:", err);
    return sendUnauthorized(res, "Authentication failed.");
  }
};

/**
 * optionalAuth — attach req.user if a valid token is present, but don't block.
 * Useful for public endpoints that return extra data for logged-in users.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select("name email role isActive isVerified");

    if (user && user.isActive) req.user = user;
  } catch (_) {
    // Silently ignore invalid / expired tokens on optional routes
  }
  next();
};

/**
 * requireVerified — blocks users whose email is not verified.
 * Must be registered AFTER protect.
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, "Authentication required.");
  }
  if (!req.user.isVerified) {
    const { sendError } = require("../utils/apiResponse");
    return sendError(res, "Please verify your email address to perform this action.", 403);
  }
  next();
};

module.exports = { protect, optionalAuth, requireVerified };
