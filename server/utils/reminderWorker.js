const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { sendEventReminderEmail } = require("./email");

async function checkAndSendReminders() {
  try {
    const now = new Date();
    const targetStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const targetEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now

    // Find published events starting in 24-25 hours
    const events = await Event.find({
      status: "published",
      deletedAt: null,
      startDate: { $gte: targetStart, $lte: targetEnd },
    });

    if (events.length === 0) return;

    console.log(`⏰ [reminderWorker] Found ${events.length} events scheduled in the next 24-25 hours.`);

    for (const event of events) {
      // Find all valid tickets for this event that haven't received a reminder
      const tickets = await Ticket.find({
        event: event._id,
        status: "valid",
        reminderSent: false,
      });

      if (tickets.length === 0) continue;

      console.log(`⏰ [reminderWorker] Sending ${tickets.length} reminders for event "${event.title}"`);

      for (const ticket of tickets) {
        if (!ticket.attendeeInfo?.email) continue;

        const emailResult = await sendEventReminderEmail({
          to: ticket.attendeeInfo.email,
          event,
          ticketCode: ticket.ticketCode,
          attendeeName: ticket.attendeeInfo.name || "Attendee",
        });

        if (emailResult.ok) {
          ticket.reminderSent = true;
          await ticket.save();
        }
      }
    }
  } catch (err) {
    console.error("❌ [reminderWorker] Error checking reminders:", err.message);
  }
}

let intervalId = null;

function start() {
  if (intervalId) return;

  // 10 seconds in development/test, 30 minutes in production
  const intervalMs =
    process.env.NODE_ENV === "production"
      ? 30 * 60 * 1000 // 30 minutes
      : 10 * 1000; // 10 seconds

  console.log(`⏰ [reminderWorker] Started. Interval: ${intervalMs / 1000}s`);

  // Run immediately on start
  checkAndSendReminders();

  intervalId = setInterval(checkAndSendReminders, intervalMs);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("⏰ [reminderWorker] Stopped.");
  }
}

module.exports = {
  start,
  stop,
  checkAndSendReminders,
};
