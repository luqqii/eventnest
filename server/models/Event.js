const mongoose = require("mongoose");

// ─── Sub-schema: Ticket Tier (defined on the event by the organizer) ─────────
const ticketTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ticket tier name is required"],
      trim: true,
      maxlength: [60, "Tier name cannot exceed 60 characters"],
    },
    type: {
      type: String,
      enum: ["general", "vip", "early-bird", "student", "group"],
      default: "general",
    },
    description: { type: String, maxlength: 300, default: "" },
    price: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Ticket quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    sold: { type: Number, default: 0 },
    // Per-order limits
    maxPerOrder: { type: Number, default: 10, min: 1 },
    minPerOrder: { type: Number, default: 1, min: 1 },
    // Sale window
    saleStartsAt: { type: Date, default: null },
    saleEndsAt: { type: Date, default: null },
    isVisible: { type: Boolean, default: true },
  },
  { _id: true }
);

ticketTierSchema.virtual("available").get(function () {
  return this.quantity - this.sold;
});

ticketTierSchema.virtual("isSoldOut").get(function () {
  return this.sold >= this.quantity;
});

// ─── Sub-schema: Venue ────────────────────────────────────────────────────────
const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: "" },
    country: { type: String, required: true, default: "US" },
    postalCode: { type: String, default: "" },
    // GeoJSON point for map queries
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    googleMapsUrl: { type: String, default: "" },
  },
  { _id: false }
);

// ─── Sub-schema: Media ────────────────────────────────────────────────────────
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main Event Schema ────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [120, "Title cannot exceed 120 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Event description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Music", "Arts", "Business", "Technology", "Sports", "Food", "College", "Other"],
        message: "Invalid category",
      },
    },

    tags: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 10,
        message: "Maximum 10 tags allowed",
      },
    },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"],
    },

    // Event scheduling
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    timezone: { type: String, default: "America/New_York" },
    isAllDay: { type: Boolean, default: false },

    // Venue
    venue: { type: venueSchema, required: true },
    isOnline: { type: Boolean, default: false },
    onlineLink: { type: String, default: "" },

    // Ticket tiers defined by the organizer
    ticketTiers: {
      type: [ticketTierSchema],
      validate: {
        validator: (v) => v.length >= 1,
        message: "At least one ticket tier is required",
      },
    },

    // Media
    coverImage: { type: String, default: "" },
    images: { type: [mediaSchema], default: [] },

    // Lifecycle
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed", "suspended"],
      default: "draft",
    },

    publishedAt: { type: Date, default: null },

    // Visibility and discovery
    isFeatured: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    accessCode: { type: String, select: false, default: null },

    // Aggregate counters (updated by background jobs / hooks)
    totalCapacity: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },

    // Refund policy
    refundPolicy: {
      type: String,
      enum: ["no-refund", "1-day", "7-days", "30-days"],
      default: "7-days",
    },

    customFields: {
      type: [
        {
          label: { type: String, required: true },
          type: { type: String, enum: ["text", "select"], default: "text" },
          options: { type: [String], default: [] },
          required: { type: Boolean, default: false }
        }
      ],
      default: []
    },

    // Soft-delete
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
eventSchema.index({ slug: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ isFeatured: 1, status: 1 });
eventSchema.index({ "venue.coordinates": "2dsphere" }); // geo queries
eventSchema.index({ title: "text", description: "text", tags: "text" }); // full-text

// ─── Virtuals ─────────────────────────────────────────────────────────────────
eventSchema.virtual("availableCapacity").get(function () {
  return this.totalCapacity - this.totalSold;
});

eventSchema.virtual("isSoldOut").get(function () {
  return this.totalSold >= this.totalCapacity;
});

eventSchema.virtual("isPast").get(function () {
  return this.endDate < new Date();
});

// ─── Pre-save: auto-generate slug + compute totalCapacity ─────────────────────
eventSchema.pre("save", function () {
  // Generate slug from title if not set
  if (this.isModified("title") && !this.slug) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 80) +
      "-" +
      Date.now().toString(36);
  }

  // Recompute total capacity
  if (this.isModified("ticketTiers")) {
    this.totalCapacity = this.ticketTiers.reduce((sum, t) => sum + t.quantity, 0);
    this.totalSold = this.ticketTiers.reduce((sum, t) => sum + t.sold, 0);
  }
});

// ─── Static: find active published events ────────────────────────────────────
eventSchema.statics.findPublished = function (filter = {}) {
  return this.find({ status: "published", deletedAt: null, ...filter });
};

module.exports = mongoose.model("Event", eventSchema);
