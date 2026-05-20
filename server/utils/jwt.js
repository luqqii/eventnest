const jwt = require("jsonwebtoken");
const { encrypt } = require("./crypto");

/**
 * Sign a short-lived access token (15 min default)
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    issuer: "eventnest-api",
    audience: "eventnest-client",
  });
};

/**
 * Sign a long-lived refresh token (7 days default)
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    issuer: "eventnest-api",
    audience: "eventnest-client",
  });
};

/**
 * Verify access token — throws on failure
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: "eventnest-api",
    audience: "eventnest-client",
  });
};

/**
 * Verify refresh token — throws on failure
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: "eventnest-api",
    audience: "eventnest-client",
  });
};

/**
 * Issue both tokens and attach refresh token as HttpOnly cookie (encrypted)
 */
const issueTokenPair = (res, user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user._id.toString() });

  // Encrypt the session cookie value before sending it to the client
  const encryptedCookieValue = encrypt(refreshToken);

  // HttpOnly cookie — signed and secure, not accessible via document.cookie
  res.cookie("refreshToken", encryptedCookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: "/api/auth",               // only sent on /api/auth routes
    signed: true,
  });

  return { accessToken, refreshToken };
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueTokenPair,
};
