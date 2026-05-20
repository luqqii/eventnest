const { body, param } = require("express-validator");

// ─── Ticket tier rules (used inside array validation) ─────────────────────────
const ticketTierRules = [
  body("ticketTiers")
    .isArray({ min: 1 }).withMessage("At least one ticket tier is required"),

  body("ticketTiers.*.name")
    .trim()
    .notEmpty().withMessage("Ticket tier name is required")
    .isLength({ max: 60 }).withMessage("Tier name cannot exceed 60 characters"),

  body("ticketTiers.*.type")
    .optional()
    .isIn(["general", "vip", "early-bird", "student", "group"])
    .withMessage("Invalid ticket type"),

  body("ticketTiers.*.price")
    .notEmpty().withMessage("Ticket price is required")
    .isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),

  body("ticketTiers.*.quantity")
    .notEmpty().withMessage("Ticket quantity is required")
    .isInt({ min: 1 }).withMessage("Quantity must be at least 1"),

  body("ticketTiers.*.maxPerOrder")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("maxPerOrder must be 1–100"),

  body("ticketTiers.*.saleStartsAt")
    .optional()
    .isISO8601().withMessage("saleStartsAt must be a valid ISO 8601 date"),

  body("ticketTiers.*.saleEndsAt")
    .optional()
    .isISO8601().withMessage("saleEndsAt must be a valid ISO 8601 date"),
];

// ─── Full event creation / update rules ──────────────────────────────────────
const createEventRules = [
  // Step 1 — Basic Info
  body("title")
    .trim()
    .notEmpty().withMessage("Event title is required")
    .isLength({ min: 5, max: 120 }).withMessage("Title must be 5–120 characters"),

  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ min: 20, max: 5000 }).withMessage("Description must be 20–5000 characters"),

  body("category")
    .notEmpty().withMessage("Category is required")
    .isIn(["Music", "Arts", "Business", "Technology", "Sports", "Food", "Other"])
    .withMessage("Invalid category"),

  body("tags")
    .optional()
    .isArray({ max: 10 }).withMessage("Maximum 10 tags allowed"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage("Each tag must be under 30 characters"),

  // Step 2 — Date & Time
  body("startDate")
    .notEmpty().withMessage("Start date is required")
    .isISO8601().withMessage("startDate must be a valid ISO 8601 date/time")
    .custom((value) => {
      if (new Date(value) < new Date(Date.now() - 5 * 60 * 1000)) {
        throw new Error("Start date must be in the future");
      }
      return true;
    }),

  body("endDate")
    .notEmpty().withMessage("End date is required")
    .isISO8601().withMessage("endDate must be a valid ISO 8601 date/time")
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("timezone")
    .optional({ values: "falsy" })
    .isLength({ max: 50 }).withMessage("Invalid timezone"),

  // Step 3 — Venue (Only required if not online)
  body("venue.name")
    .if((value, { req }) => !req.body.isOnline)
    .trim()
    .notEmpty().withMessage("Venue name is required"),

  body("venue.address")
    .if((value, { req }) => !req.body.isOnline)
    .trim()
    .notEmpty().withMessage("Venue address is required"),

  body("venue.city")
    .if((value, { req }) => !req.body.isOnline)
    .trim()
    .notEmpty().withMessage("Venue city is required"),

  body("venue.country")
    .if((value, { req }) => !req.body.isOnline)
    .optional({ values: "falsy" })
    .isLength({ min: 2, max: 60 }).withMessage("Invalid country"),

  body("isOnline")
    .optional()
    .isBoolean().withMessage("isOnline must be a boolean"),

  body("onlineLink")
    .optional({ values: "falsy" })
    .isURL().withMessage("onlineLink must be a valid URL"),

  // Step 4 — Ticket Tiers
  ...ticketTierRules,

  // Step 5 — Media (optional at creation)
  body("coverImage")
    .optional({ values: "falsy" })
    .isURL().withMessage("coverImage must be a valid URL"),

  // Step 6 — Settings
  body("refundPolicy")
    .optional({ values: "falsy" })
    .isIn(["no-refund", "1-day", "7-days", "30-days"])
    .withMessage("Invalid refund policy"),

  body("isPrivate")
    .optional()
    .isBoolean().withMessage("isPrivate must be a boolean"),
];

// ─── Publish-only rule ────────────────────────────────────────────────────────
const publishEventRules = [
  param("id")
    .isMongoId().withMessage("Invalid event ID"),
];

// ─── Shared param rule ────────────────────────────────────────────────────────
const eventIdParamRule = [
  param("id").isMongoId().withMessage("Invalid event ID"),
];

module.exports = {
  createEventRules,
  publishEventRules,
  eventIdParamRule,
  ticketTierRules,
};
