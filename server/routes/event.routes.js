const router = require("express").Router();
const { protect, optionalAuth, requireVerified } = require("../middleware/auth");
const { isOrganizer } = require("../middleware/roles");
const {
  createEventRules,
  publishEventRules,
  eventIdParamRule,
} = require("../validators/event.validator");
const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  publishEvent,
  deleteEvent,
  getMyEvents,
  suggestEvents,
} = require("../controllers/event.controller");

/**
 * @route  GET /api/events
 * @desc   List published events with filters (category, city, search, featured)
 *         and pagination (?page=1&limit=12&sort=startDate)
 * @access Public
 */
router.get("/", optionalAuth, listEvents);

/**
 * @route  GET /api/events/suggest?q=<query>
 * @desc   Autocomplete — returns up to 6 published event title matches
 * @access Public
 */
router.get("/suggest", suggestEvents);

/**
 * @route  GET /api/events/my
 * @desc   List the authenticated organizer's own events (all statuses)
 * @access Private — Organizer / Admin
 */
router.get("/my", protect, isOrganizer, getMyEvents);

/**
 * @route  POST /api/events
 * @desc   Create a new event (Event Creation Wizard)
 *
 *         Body shape:
 *         {
 *           title, description, category, tags?,
 *           startDate, endDate, timezone?,
 *           venue: { name, address, city, country },
 *           isOnline?, onlineLink?,
 *           ticketTiers: [{ name, type, price, quantity }],
 *           coverImage?, images?,
 *           refundPolicy?, isPrivate?,
 *           publish?     ← if true, go straight to "published" status
 *         }
 *
 * @access Private — Organizer / Admin
 */
router.post("/", protect, isOrganizer, requireVerified, ...createEventRules, createEvent);

/**
 * @route  GET /api/events/:id
 * @desc   Get a single event by MongoDB ObjectId or slug
 * @access Public (unpublished events visible to owner/admin only)
 */
router.get("/:id", optionalAuth, getEvent);

/**
 * @route  PATCH /api/events/:id
 * @desc   Update a draft or published event
 * @access Private — Organizer (own events) / Admin
 */
router.patch("/:id", protect, isOrganizer, requireVerified, ...eventIdParamRule, updateEvent);

/**
 * @route  PATCH /api/events/:id/publish
 * @desc   Publish a draft event
 * @access Private — Organizer (own events) / Admin
 */
router.patch("/:id/publish", protect, isOrganizer, requireVerified, ...publishEventRules, publishEvent);

/**
 * @route  DELETE /api/events/:id
 * @desc   Soft-delete an event (sets deletedAt, marks as cancelled)
 * @access Private — Organizer (own events) / Admin
 */
router.delete("/:id", protect, isOrganizer, ...eventIdParamRule, deleteEvent);

module.exports = router;
