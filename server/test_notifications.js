/**
 * Notifications & Reminders Module Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Verification script to simulate refund, update, cancellation, and 24-hour reminders.
 *
 * Usage:
 *   node test_notifications.js
 */

const path = require("path");
const fs = require("fs");

// Load server environment variables
require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("dns");

// Force Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

// Import Mongoose Models relative to server
const Order = require("./models/Order");
const Ticket = require("./models/Ticket");
const Event = require("./models/Event");
const User = require("./models/User");

// Import email utilities and reminder worker
const {
  sendRefundEmail,
  sendEventUpdateEmail,
  sendEventCancelledEmail,
} = require("./utils/email");
const { checkAndSendReminders } = require("./utils/reminderWorker");

async function run() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/eventnest";
  console.log(`🔌 Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  let tempEvent = null;
  let tempOrder = null;
  let tempTicket = null;
  let tempUser = null;

  try {
    // 1. Send direct Refund email test
    console.log("\n✉️  [Test 1] Dispatching refund confirmation email directly...");
    const refundRes = await sendRefundEmail({
      to: "refund-test@eventnest.dev",
      orderNumber: "ORD-REFUNDTEST",
      total: 99.99,
      eventTitle: "Verifying Notifications Event",
      buyerName: "Test Refundee",
    });
    if (refundRes.ok) {
      console.log("✅ Refund confirmation email successfully sent to Ethereal.");
    } else {
      console.error("❌ Refund email failed:", refundRes.error);
    }

    // 2. Send direct Event Update email test
    console.log("\n✉️  [Test 2] Dispatching event update email directly...");
    const updateRes = await sendEventUpdateEmail({
      to: "update-test@eventnest.dev",
      eventTitle: "Verifying Notifications Event",
      changes: {
        "Venue": "The Grand ballroom, Metropolis City",
        "Start Date/Time": new Date(Date.now() + 48 * 3600 * 1000).toLocaleString(),
      },
      buyerName: "Test Updatee",
      eventUrl: "http://localhost:3000/events/verifying-notifications-event",
    });
    if (updateRes.ok) {
      console.log("✅ Event update email successfully sent to Ethereal.");
    } else {
      console.error("❌ Event update email failed:", updateRes.error);
    }

    // 3. Send direct Event Cancellation email test
    console.log("\n✉️  [Test 3] Dispatching event cancellation email directly...");
    const cancelRes = await sendEventCancelledEmail({
      to: "cancel-test@eventnest.dev",
      eventTitle: "Verifying Notifications Event",
      buyerName: "Test Cancellee",
      refundStatus: "Refunded via Stripe",
    });
    if (cancelRes.ok) {
      console.log("✅ Event cancellation email successfully sent to Ethereal.");
    } else {
      console.error("❌ Event cancellation email failed:", cancelRes.error);
    }

    // 4. Test 24-hour reminder worker and flow
    console.log("\n⏳ [Test 4] Testing 24h Reminder worker...");

    // Create a temporary attendee/buyer user
    tempUser = new User({
      name: "Temporary Attendee",
      email: "temp-attendee-" + Math.random().toString(36).substring(7) + "@eventnest.dev",
      password: "password123",
      role: "attendee",
      isVerified: true,
    });
    await tempUser.save();

    // Create a temporary event scheduled for exactly 24.5 hours in the future
    const eventTime = new Date(Date.now() + 24.5 * 60 * 60 * 1000); // 24.5h from now
    tempEvent = new Event({
      title: "Temporary Future Event",
      slug: "temp-future-event-" + Math.random().toString(36).substring(7),
      description: "Temporary event to test reminder scheduler",
      category: "Music",
      organizer: tempUser._id, // Organizer reference
      startDate: eventTime,
      endDate: new Date(eventTime.getTime() + 2 * 60 * 60 * 1000),
      timezone: "America/New_York",
      venue: {
        name: "Test Arena",
        address: "123 Test St",
        city: "Testville",
        country: "US",
      },
      status: "published",
      ticketTiers: [
        {
          name: "General Admission",
          price: 25.0,
          quantity: 100,
          sold: 0,
        },
      ],
    });
    await tempEvent.save();

    // Create a temporary Order
    tempOrder = new Order({
      event: tempEvent._id,
      buyer: tempUser._id,
      orderNumber: "ORD-TEMP-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      status: "confirmed",
      subtotal: 25.0,
      serviceFee: 0.0,
      total: 25.0,
      lines: [
        {
          tierId: tempEvent.ticketTiers[0]._id,
          tierName: "General Admission",
          tierType: "general",
          unitPrice: 25.0,
          quantity: 1,
          amount: 25.0,
          subtotal: 25.0,
        },
      ],
      billingInfo: {
        name: tempUser.name,
        email: tempUser.email,
      },
    });
    await tempOrder.save();

    // Create a temporary Ticket
    tempTicket = new Ticket({
      event: tempEvent._id,
      order: tempOrder._id,
      attendee: tempUser._id,
      tierSnapshot: {
        tierId: tempEvent.ticketTiers[0]._id,
        name: "General Admission",
        price: 25.0,
      },
      attendeeInfo: {
        name: tempUser.name,
        email: tempUser.email,
      },
      status: "valid",
      reminderSent: false,
    });
    await tempTicket.save();

    console.log(`✅ Temporary test data populated:`);
    console.log(`   Event ID: ${tempEvent._id} (Scheduled at: ${eventTime.toISOString()})`);
    console.log(`   Ticket ID: ${tempTicket._id} (reminderSent: ${tempTicket.reminderSent})`);

    console.log("\n🚀 Triggering checkAndSendReminders() background worker process...");
    await checkAndSendReminders();

    // Re-fetch the ticket and verify reminderSent is true
    const updatedTicket = await Ticket.findById(tempTicket._id);
    console.log(`\n🔍 Verifying ticket state in database:`);
    console.log(`   reminderSent (expected true): ${updatedTicket.reminderSent}`);

    if (updatedTicket.reminderSent) {
      console.log("🎉 SUCCESS: Reminder was successfully dispatched and flagged in MongoDB!");
    } else {
      console.error("❌ FAILURE: Ticket was not updated by the reminder worker!");
    }

  } catch (error) {
    console.error("\n❌ Error running verification:", error);
  } finally {
    // 5. Clean up temporary records
    console.log("\n🧹 Cleaning up temporary test data from MongoDB...");
    if (tempTicket) {
      await Ticket.deleteOne({ _id: tempTicket._id });
      console.log(`   Deleted Ticket: ${tempTicket._id}`);
    }
    if (tempOrder) {
      await Order.deleteOne({ _id: tempOrder._id });
      console.log(`   Deleted Order: ${tempOrder._id}`);
    }
    if (tempEvent) {
      await Event.deleteOne({ _id: tempEvent._id });
      console.log(`   Deleted Event: ${tempEvent._id}`);
    }
    if (tempUser) {
      await User.deleteOne({ _id: tempUser._id });
      console.log(`   Deleted User: ${tempUser._id}`);
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

run();
