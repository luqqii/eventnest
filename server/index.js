/**
 * EventNest API
 * ─────────────────────────────────────────────────────────────────────────────
 * Stack   : Node.js · Express 5 · MongoDB (Mongoose) · JWT Auth
 * Entry   : node index.js  |  nodemon index.js (dev)
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const orderRoutes = require("./routes/order.routes");
const ticketRoutes = require("./routes/ticket.routes");
const paymentRoutes = require("./routes/payment.routes");
const promoCodeRoutes = require("./routes/promoCode.routes");
const adminRoutes = require("./routes/admin.routes");
const { handleWebhook } = require("./controllers/payment.controller");

// ─── App init ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== "production";

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow Next.js frontend
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://eventnest-fullstack.vercel.app",
      "https://eventbookings-ten.vercel.app", 
      "https://eventnest-delta.vercel.app",
      process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true,          // needed for HttpOnly cookie exchange
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
  })
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,
  message: { success: false, error: "Too many auth attempts. Please wait 15 minutes." },
});

app.use(globalLimiter);

// ─── Stripe webhook — raw body MUST come before express.json() ───────────────
// Stripe requires the raw Buffer to verify the webhook signature.
// Registering this route here (before express.json) ensures the body is not
// parsed by the global JSON middleware.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── HTTP logging ─────────────────────────────────────────────────────────────
app.use(morgan(isDev ? "dev" : "combined"));

// ─── Health check ─────────────────────────────────────────────────────────────
// Available at both /health (direct) and /api/health (via Next.js rewrite proxy)
const healthHandler = (req, res) => {
  const mongoose = require("mongoose");
  res.status(200).json({
    success: true,
    message: "EventNest API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/promo-codes", promoCodeRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 + Global error handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start server (only after DB is connected) ────────────────────────────────
async function start() {
  await connectDB();   // exits via process.exit(1) if MongoDB is unreachable

  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   EventNest API                          ║
  ║   http://localhost:${PORT}                  ║
  ║   Environment : ${(process.env.NODE_ENV || "development").padEnd(20)}║
  ╚══════════════════════════════════════════╝
    `);
  });
}

start();

module.exports = app; // for testing
