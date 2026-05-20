const { validationResult } = require("express-validator");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { sendEventUpdateEmail, sendEventCancelledEmail } = require("../utils/email");
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendValidationError,
  sendForbidden,
  sendNotFound,
} = require("../utils/apiResponse");

// ─── Helper: build the default query projection ───────────────────────────────
const PUBLIC_FIELDS = "title slug description category tags organizer startDate endDate timezone venue coverImage status isFeatured totalCapacity totalSold refundPolicy createdAt";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/events
// Create a new event (organizer or admin only).
// Supports a multi-step wizard — all steps can be sent at once or iteratively
// using PATCH /api/events/:id to update a draft.
// ─────────────────────────────────────────────────────────────────────────────
const createEvent = async (req, res, next) => {
  try {
    // 1. Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const {
      title,
      slug,
      description,
      category,
      tags = [],
      startDate,
      endDate,
      timezone,
      isAllDay,
      venue,
      isOnline,
      onlineLink,
      ticketTiers,
      coverImage,
      images,
      refundPolicy,
      isPrivate,
      customFields = [],
      // publish flag: if true, set status = "published" immediately
      publish = false,
    } = req.body;

    // 2. Build event document
    const event = await Event.create({
      title,
      slug: slug || undefined,
      description,
      category,
      tags,
      organizer: req.user._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      timezone: timezone || "America/New_York",
      isAllDay: isAllDay || false,
      venue: {
        name: isOnline ? "Online Event" : (venue?.name || ""),
        address: isOnline ? "Internet" : (venue?.address || ""),
        city: isOnline ? "Virtual" : (venue?.city || ""),
        country: isOnline ? "US" : (venue?.country || "US"),
      },
      isOnline: isOnline || false,
      onlineLink: onlineLink || "",
      ticketTiers,
      coverImage: coverImage || "",
      images: images || [],
      refundPolicy: refundPolicy || "7-days",
      isPrivate: isPrivate || false,
      customFields: customFields || [],
      status: publish ? "published" : "draft",
      publishedAt: publish ? new Date() : null,
    });

    // 3. Populate organizer name for the response
    await event.populate("organizer", "name email avatar organizerProfile");

    return sendCreated(
      res,
      { event },
      publish ? "Event published successfully" : "Event saved as draft"
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events
// Public list — only published events, with filtering/sorting/pagination.
// ─────────────────────────────────────────────────────────────────────────────
const listEvents = async (req, res, next) => {
  try {
    const {
      category,
      city,
      search,
      featured,
      page = 1,
      limit = 12,
      sort = "startDate",
    } = req.query;

    const filter = { status: "published", deletedAt: null };

    if (category) filter.category = category;
    if (city) filter["venue.city"] = { $regex: city, $options: "i" };
    if (featured === "true") filter.isFeatured = true;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const sortMap = {
      startDate: { startDate: 1 },
      "-startDate": { startDate: -1 },
      price: { "ticketTiers.0.price": 1 },
      popular: { totalSold: -1 },
      newest: { createdAt: -1 },
    };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .select(PUBLIC_FIELDS)
        .populate("organizer", "name avatar organizerProfile.companyName")
        .sort(sortMap[sort] || { startDate: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Event.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      events,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
        hasNext: skip + events.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/:id
// Public — get single event by ID or slug.
// ─────────────────────────────────────────────────────────────────────────────
const getEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Support both ObjectId and slug lookups
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id };

    const event = await Event.findOne({ ...query, deletedAt: null })
      .populate("organizer", "name avatar bio organizerProfile");

    if (!event) return sendNotFound(res, "Event");

    // Non-organizers can only see published events
    const isOrganizer =
      req.user &&
      (req.user.role === "admin" ||
        event.organizer._id.toString() === req.user._id.toString());

    if (event.status !== "published" && !isOrganizer) {
      return sendNotFound(res, "Event");
    }

    return sendSuccess(res, { event });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/events/:id
// Update event — organizer (own events) or admin only.
// ─────────────────────────────────────────────────────────────────────────────
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, deletedAt: null });
    if (!event) return sendNotFound(res, "Event");

    // Ownership check
    const isOwner = event.organizer.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return sendForbidden(res, "You can only edit your own events.");
    }

    // Prevent editing published/completed/cancelled events (only admin can)
    if (
      ["completed", "cancelled"].includes(event.status) &&
      req.user.role !== "admin"
    ) {
      return sendError(
        res,
        `Cannot edit an event with status '${event.status}'.`,
        422
      );
    }

    // Fields that are safe to update
    const updatable = [
      "title", "slug", "description", "category", "tags",
      "startDate", "endDate", "timezone", "isAllDay",
      "venue", "isOnline", "onlineLink",
      "ticketTiers", "coverImage", "images",
      "refundPolicy", "isPrivate", "customFields",
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "slug" && !req.body[field]) {
          event[field] = undefined;
        } else {
          event[field] = req.body[field];
        }
      }
    });

    if (event.isOnline) {
      event.venue = {
        name: event.venue?.name || "Online Event",
        address: event.venue?.address || "Internet",
        city: event.venue?.city || "Virtual",
        country: event.venue?.country || "US",
      };
    }

    // Track modifications for notification if event is published
    const wasPublished = event.status === "published";
    const changes = {};

    if (wasPublished) {
      if (event.isModified("startDate") && event.startDate) {
        changes["Start Date/Time"] = new Date(event.startDate).toLocaleString();
      }
      if (event.isModified("venue") && event.venue) {
        changes["Venue"] = `${event.venue.name || "Online"}, ${event.venue.city || "Virtual"}`;
      }
      if (event.isModified("onlineLink") && event.onlineLink) {
        changes["Online Link"] = event.onlineLink;
      }
      if (event.isModified("title") && event.title) {
        changes["Title"] = event.title;
      }
    }

    await event.save();
    await event.populate("organizer", "name email avatar");

    // Trigger update emails in background (fire-and-forget)
    if (wasPublished && Object.keys(changes).length > 0) {
      Ticket.find({ event: event._id, status: "valid" })
        .then((tickets) => {
          const recipients = new Map();
          tickets.forEach((t) => {
            if (t.attendeeInfo?.email) {
              recipients.set(t.attendeeInfo.email.toLowerCase(), t.attendeeInfo.name || "Attendee");
            }
          });

          for (const [email, name] of recipients.entries()) {
            sendEventUpdateEmail({
              to: email,
              eventTitle: event.title,
              changes,
              buyerName: name,
              eventUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/events/${event.slug}`,
            }).catch((err) => {
              console.error(`[email] Failed to send update email to ${email}:`, err.message);
            });
          }
        })
        .catch((err) => {
          console.error("[email] Failed to query tickets for update emails:", err.message);
        });
    }

    return sendSuccess(res, { event }, "Event updated");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/events/:id/publish
// Publish a draft event.
// ─────────────────────────────────────────────────────────────────────────────
const publishEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, deletedAt: null });
    if (!event) return sendNotFound(res, "Event");

    const isOwner = event.organizer.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return sendForbidden(res, "You can only publish your own events.");
    }

    if (event.status === "published") {
      return sendError(res, "Event is already published.", 422);
    }

    event.status = "published";
    event.publishedAt = new Date();
    await event.save();

    return sendSuccess(res, { event }, "Event is now live");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/events/:id
// Soft-delete — sets deletedAt, never actually removes from DB.
// ─────────────────────────────────────────────────────────────────────────────
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, deletedAt: null });
    if (!event) return sendNotFound(res, "Event");

    const isOwner = event.organizer.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return sendForbidden(res, "You can only delete your own events.");
    }

    event.deletedAt = new Date();
    event.status = "cancelled";
    await event.save();

    // Fetch and cancel all valid tickets, notifying attendees (fire-and-forget)
    Ticket.find({ event: event._id, status: "valid" })
      .then(async (tickets) => {
        if (tickets.length === 0) return;

        // Mark tickets as cancelled
        await Ticket.updateMany(
          { event: event._id, status: "valid" },
          { status: "cancelled", cancelledAt: new Date() }
        );

        // Group by email and send cancellation emails
        const recipients = new Map();
        tickets.forEach((t) => {
          if (t.attendeeInfo?.email) {
            recipients.set(t.attendeeInfo.email.toLowerCase(), t.attendeeInfo.name || "Attendee");
          }
        });

        for (const [email, name] of recipients.entries()) {
          sendEventCancelledEmail({
            to: email,
            eventTitle: event.title,
            buyerName: name,
            refundStatus: "A full refund has been initiated and will be processed automatically.",
          }).catch((err) => {
            console.error(`[email] Failed to send cancellation email to ${email}:`, err.message);
          });
        }
      })
      .catch((err) => {
        console.error("[email] Failed to query or cancel tickets for event deletion:", err.message);
      });

    return sendSuccess(res, null, "Event deleted");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/my
// Organizer: list all their own events (all statuses).
// ─────────────────────────────────────────────────────────────────────────────
const getMyEvents = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { organizer: req.user._id, deletedAt: null };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Event.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      events,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/suggest?q=<query>
// Autocomplete — returns up to 6 matching published event titles.
// ─────────────────────────────────────────────────────────────────────────────
const suggestEvents = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const trimmed = q.trim();
    if (trimmed.length < 2) return sendSuccess(res, { suggestions: [] });

    const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const events = await Event.find({
      status: "published",
      deletedAt: null,
      $or: [{ title: regex }, { "venue.city": regex }, { category: regex }],
    })
      .select("title category venue slug _id")
      .limit(6)
      .lean();

    return sendSuccess(res, { suggestions: events });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  publishEvent,
  deleteEvent,
  getMyEvents,
  suggestEvents,
};
