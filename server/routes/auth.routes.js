const router = require("express").Router();
const { signupRules, loginRules } = require("../validators/auth.validator");
const { protect } = require("../middleware/auth");
const {
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
} = require("../controllers/auth.controller");

/**
 * @route  POST /api/auth/signup
 * @desc   Register a new user (attendee or organizer)
 * @access Public
 */
router.post("/signup", ...signupRules, signup);

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate user, return access token + set refresh token cookie
 * @access Public
 */
router.post("/login", ...loginRules, login);

/**
 * @route  POST /api/auth/refresh
 * @desc   Issue a new access token using the HttpOnly refresh token cookie
 * @access Public (requires valid refresh cookie)
 */
router.post("/refresh", refresh);

/**
 * @route  POST /api/auth/logout
 * @desc   Clear refresh token cookie and invalidate server-side token
 * @access Private
 */
router.post("/logout", protect, logout);

/**
 * @route  GET /api/auth/me
 * @desc   Get the currently authenticated user's profile
 * @access Private
 */
router.get("/me", protect, getMe);

/**
 * @route  PATCH /api/auth/me
 * @desc   Update own profile (name, bio, avatar, organizerProfile)
 * @access Private
 */
router.patch("/me", protect, updateMe);

/**
 * @route  POST /api/auth/forgot-password
 * @desc   Request password reset link
 * @access Public
 */
router.post("/forgot-password", forgotPassword);

/**
 * @route  POST /api/auth/reset-password
 * @desc   Reset password using token
 * @access Public
 */
router.post("/reset-password", resetPassword);

/**
 * @route  GET /api/auth/verify-email/:token
 * @desc   Verify email token
 * @access Public
 */
router.get("/verify-email/:token", verifyEmail);

/**
 * @route  POST /api/auth/resend-verification
 * @desc   Resend email verification token
 * @access Private
 */
router.post("/resend-verification", protect, resendVerification);

/**
 * @route  POST /api/auth/google
 * @desc   OAuth / Google Identity Services Login/Signup
 * @access Public
 */
router.post("/google", googleLogin);

module.exports = router;
