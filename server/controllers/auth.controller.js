const { validationResult } = require("express-validator");
const User = require("../models/User");
const { issueTokenPair, verifyRefreshToken, signAccessToken } = require("../utils/jwt");
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendValidationError,
  sendUnauthorized,
} = require("../utils/apiResponse");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/email");
const { decrypt } = require("../utils/crypto");

// ─── Helper: format user for response ────────────────────────────────────────
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  bio: user.bio,
  isVerified: user.isVerified,
  organizerProfile: user.role === "organizer" ? user.organizerProfile : undefined,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { name, email, password, role = "attendee" } = req.body;

    // Check duplicate email
    const exists = await User.findOne({ email });
    if (exists) {
      return sendError(res, "An account with this email already exists.", 409);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const verifyToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      role,
      verifyToken,
      verifyTokenExpiry,
    });

    const { accessToken } = issueTokenPair(res, user);

    const salt = await bcrypt.genSalt(10);
    await User.findByIdAndUpdate(user._id, {
      refreshToken: await bcrypt.hash(
        signAccessToken({ sub: user._id }),
        salt
      ),
      lastLoginAt: new Date(),
    });

    sendVerificationEmail({ to: user.email, name: user.name, token: rawToken }).catch((err) => {
      console.error("[email] Verification email failed to send on signup:", err.message);
    });

    return sendCreated(
      res,
      { user: formatUser(user), accessToken },
      "Account created successfully"
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { email, password } = req.body;

    // Fetch user with password (select: false by default)
    const user = await User.findOne({ email }).select(
      "+password +refreshToken"
    );

    if (!user || !(await user.comparePassword(password))) {
      // Deliberately vague — do not reveal which field was wrong
      return sendUnauthorized(res, "Invalid email or password.");
    }

    if (!user.isActive) {
      return sendUnauthorized(res, "This account has been deactivated.");
    }

    const { accessToken } = issueTokenPair(res, user);

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    return sendSuccess(
      res,
      { user: formatUser(user), accessToken },
      "Login successful"
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const token = req.signedCookies?.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      return sendUnauthorized(res, "Refresh token not found.");
    }

    const decryptedToken = decrypt(token);
    if (!decryptedToken) {
      return sendUnauthorized(res, "Invalid or expired session cookie.");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(decryptedToken);
    } catch {
      return sendUnauthorized(res, "Invalid or expired refresh token.");
    }

    const user = await User.findById(decoded.sub).select("name email role isActive");
    if (!user || !user.isActive) {
      return sendUnauthorized(res, "Account not found or deactivated.");
    }

    // Issue new pair (refresh token rotation)
    const { accessToken } = issueTokenPair(res, user);

    return sendSuccess(res, { accessToken }, "Token refreshed");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    // Clear the HttpOnly refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/api/auth",
      signed: true,
    });

    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }

    return sendSuccess(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendUnauthorized(res, "Account not found.");
    return sendSuccess(res, { user: formatUser(user) });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/me  — update own profile
// ─────────────────────────────────────────────────────────────────────────────
const updateMe = async (req, res, next) => {
  try {
    const { name, bio, avatar, organizerProfile } = req.body;

    // Only allow safe fields
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    if (organizerProfile && req.user.role === "organizer") {
      updates.organizerProfile = {
        ...req.user.organizerProfile,
        ...organizerProfile,
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return sendSuccess(res, { user: formatUser(user) }, "Profile updated");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, "Email is required.", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendSuccess(res, null, "If that email is registered, a password reset link has been sent.");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const passwordResetExpiry = Date.now() + 3600000; // 1 hour

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken,
      passwordResetExpiry,
    });

    sendPasswordResetEmail({ to: user.email, name: user.name, token: rawToken }).catch((err) => {
      console.error("[email] Forgot password email failed to send:", err.message);
    });

    return sendSuccess(res, null, "If that email is registered, a password reset link has been sent.");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return sendError(res, "Token and new password are required.", 400);
    }

    if (password.length < 8) {
      return sendError(res, "Password must be at least 8 characters long.", 400);
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, "Invalid or expired reset token.", 400);
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    return sendSuccess(res, null, "Password reset successful. You can now log in.");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email/:token
// ─────────────────────────────────────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return sendError(res, "Verification token is required.", 400);
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      verifyToken: hashedToken,
      verifyTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, "Invalid or expired verification token.", 400);
    }

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    return sendSuccess(res, null, "Email verified successfully.");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    if (user.isVerified) {
      return sendError(res, "Your email is already verified.", 400);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const verifyToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await User.findByIdAndUpdate(user._id, {
      verifyToken,
      verifyTokenExpiry,
    });

    sendVerificationEmail({ to: user.email, name: user.name, token: rawToken }).catch((err) => {
      console.error("[email] Resend verification email failed:", err.message);
    });

    return sendSuccess(res, null, "Verification link sent. Please check your inbox.");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────────────────
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return sendError(res, "Google credential token is required.", 400);
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) {
      return sendError(res, "Google verification failed.", 400);
    }
    const payload = await response.json();
    const { email, name, picture } = payload;

    if (!email) {
      return sendError(res, "Google account does not provide email.", 400);
    }

    let user = await User.findOne({ email }).select("+refreshToken");
    let isNewUser = false;

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: randomPassword,
        role: "attendee",
        avatar: picture || null,
        isVerified: true,
      });
      isNewUser = true;
    }

    const { accessToken } = issueTokenPair(res, user);
    
    const salt = await bcrypt.genSalt(10);
    await User.findByIdAndUpdate(user._id, {
      refreshToken: await bcrypt.hash(
        signAccessToken({ sub: user._id }),
        salt
      ),
      lastLoginAt: new Date(),
    });

    return sendSuccess(
      res,
      { user: formatUser(user), accessToken, isNewUser },
      "Google login successful"
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleLogin,
};
