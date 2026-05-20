const mongoose = require("mongoose");
const crypto = require("crypto");

/*
  Ticket = one individual ticket issued to one attendee.
  An Order may contain multiple Tickets.
*/
const ticketSchema = new mongoose.Schema(
  {
    // ─── References ──────────────────────────────────────────────
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ─── Ticket tier snapshot (denormalised at purchase time) ────
    tierSnapshot: {
      tierId: mongoose.Schema.Types.ObjectId,
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ["general", "vip", "early-bird", "student", "group"],
      },
      price: { type: Number, required: true },
    },

    // ─── Attendee info (can differ from account holder) ──────────
    attendeeInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: "" },
    },

    // ─── Unique ticket identifier (shown on the ticket) ──────────
    ticketCode: {
      type: String,
      unique: true,
      uppercase: true,
    },

    // ─── QR Code payload (base64 or URL to image) ────────────────
    qrPayload: {
      type: String,
      default: null,
    },

    // ─── Lifecycle ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ["valid", "used", "cancelled", "refunded", "transferred"],
      default: "valid",
    },

    checkedInAt: { type: Date, default: null },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },

    // ─── Transfer history ─────────────────────────────────────────
    transferHistory: [
      {
        fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        transferredAt: { type: Date, default: Date.now },
      },
    ],
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
ticketSchema.index({ ticketCode: 1 }, { unique: true });
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ order: 1 });
ticketSchema.index({ attendee: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
ticketSchema.virtual("isValid").get(function () {
  return this.status === "valid";
});

ticketSchema.virtual("isCheckedIn").get(function () {
  return this.checkedInAt !== null;
});

// ─── Pre-save: generate unique ticket code ────────────────────────────────────
ticketSchema.pre("save", function () {
  if (!this.ticketCode) {
    // Format: EB-XXXXXXXX (8 hex chars, uppercase)
    this.ticketCode = "EB-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  }
});

// ─── Instance method: mark as checked-in ─────────────────────────────────────
ticketSchema.methods.checkIn = async function (staffUserId) {
  if (this.status !== "valid") {
    throw new Error(`Cannot check in ticket with status: ${this.status}`);
  }
  this.status = "used";
  this.checkedInAt = new Date();
  this.checkedInBy = staffUserId;
  return this.save();
};

module.exports = mongoose.model("Ticket", ticketSchema);
