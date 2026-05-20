const mongoose = require("mongoose");

/*
  Order = one checkout transaction.
  One order → one or more Ticket documents.
*/

// ─── Sub-schema: Line item per tier ──────────────────────────────────────────
const orderLineSchema = new mongoose.Schema(
  {
    tierId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tierName: { type: String, required: true },
    tierType: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// ─── Sub-schema: Payment details ─────────────────────────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["card", "paypal", "apple_pay", "google_pay", "free"],
      default: "card",
    },
    provider: { type: String, default: "stripe" }, // stripe | paypal | etc.
    transactionId: { type: String, default: null },
    last4: { type: String, default: null },     // last 4 digits of card
    brand: { type: String, default: null },     // visa | mastercard | amex
    paidAt: { type: Date, default: null },
    failureCode: { type: String, default: null },
    failureMessage: { type: String, default: null },
  },
  { _id: false }
);

// ─── Main Order Schema ────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    // ─── References ──────────────────────────────────────────────
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // ─── Order number (human-readable, shown on receipts) ────────
    orderNumber: {
      type: String,
      unique: true,
      uppercase: true,
    },

    // ─── Line items ───────────────────────────────────────────────
    lines: {
      type: [orderLineSchema],
      validate: {
        validator: (v) => v.length >= 1,
        message: "Order must have at least one line item",
      },
    },

    // ─── Pricing ──────────────────────────────────────────────────
    subtotal: { type: Number, required: true, min: 0 },
    serviceFeeRate: { type: Number, default: 0.08 },  // 8%
    serviceFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },

    // ─── Promo / discount ─────────────────────────────────────────
    promoCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },

    // ─── Buyer contact snapshot ───────────────────────────────────
    billingInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: "" },
    },

    // ─── Status lifecycle ─────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",      // checkout started, payment not captured
        "confirmed",    // payment successful, tickets issued
        "cancelled",    // cancelled before payment
        "refunded",     // full refund issued
        "partially_refunded",
        "failed",       // payment failed
      ],
      default: "pending",
    },

    // ─── Timestamps for status changes ───────────────────────────
    confirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },

    // ─── Payment ─────────────────────────────────────────────────
    payment: { type: paymentSchema, default: () => ({}) },

    // ─── Issued tickets (back-ref) ────────────────────────────────
    tickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
      },
    ],

    // ─── Refund tracking ─────────────────────────────────────────
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: "" },

    // ─── Stripe ──────────────────────────────────────────────────
    stripeSessionId: { type: String, default: null, index: true },
    stripePaymentIntentId: { type: String, default: null },

    // ─── Internal notes ──────────────────────────────────────────
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ event: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

// ─── Virtual: total ticket count ─────────────────────────────────────────────
orderSchema.virtual("ticketCount").get(function () {
  return this.lines.reduce((sum, l) => sum + l.quantity, 0);
});

// ─── Pre-save: generate order number ─────────────────────────────────────────
orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${ts}-${rand}`;
  }
});

// ─── Static: revenue summary for a given event ───────────────────────────────
orderSchema.statics.revenueByEvent = function (eventId) {
  return this.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId), status: "confirmed" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$total" },
        totalOrders: { $sum: 1 },
        totalTickets: { $sum: { $reduce: { input: "$lines", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } },
      },
    },
  ]);
};

module.exports = mongoose.model("Order", orderSchema);
