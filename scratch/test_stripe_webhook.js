/**
 * Stripe Webhook Simulation Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds the latest 'pending' Order in MongoDB, simulates the payment confirmation,
 * issues Ticket documents with QR codes, increments sold counters on Event/Tiers,
 * and triggers Nodemailer email notifications.
 *
 * Usage:
 *   node scratch/test_stripe_webhook.js
 */

const path = require("path");
const fs = require("fs");

// Load server environment variables
const envPath = path.join(__dirname, "../server/.env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  console.error(`⚠️  Server .env file not found at: ${envPath}`);
  process.exit(1);
}

const mongoose = require("mongoose");
const QRCode = require("qrcode");
const dns = require("dns");

// Force Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

// Import Mongoose Models relative to server
const Order = require("../server/models/Order");
const Ticket = require("../server/models/Ticket");
const Event = require("../server/models/Event");
const User = require("../server/models/User");
const { sendTicketEmail } = require("../server/utils/email");

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

  try {
    // Find the latest pending order
    console.log("🔍 Searching for the latest pending order...");
    const order = await Order.findOne({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("event");

    if (!order) {
      console.log("\n⚠️  No pending orders found in the database.");
      console.log("💡 Please go to the web app, book tickets for an event, select Stripe payment checkout, and then run this script again before checking out.");
      mongoose.disconnect();
      return;
    }

    console.log(`\n📦 Found Pending Order:`);
    console.log(`   ID:            ${order._id}`);
    console.log(`   Order Number:  ${order.orderNumber}`);
    console.log(`   Event:         ${order.event?.title ?? "Unknown Event"}`);
    console.log(`   Buyer:         ${order.billingInfo.name} (${order.billingInfo.email})`);
    console.log(`   Total Amount:  $${order.total.toFixed(2)}`);
    console.log(`   Ticket Qty:    ${order.lines.reduce((s, l) => s + l.quantity, 0)}`);

    console.log("\n🚀 Simulating checkout completion...");

    // Update order status
    order.status = "confirmed";
    order.confirmedAt = new Date();
    order.stripePaymentIntentId = "pi_mock_" + Math.random().toString(36).substring(2, 10);
    order.payment = {
      method: "card",
      provider: "stripe",
      transactionId: order.stripePaymentIntentId,
      paidAt: new Date(),
    };

    // Issue tickets with QR codes
    const issuedTickets = [];
    const eventObj = order.event;

    for (const line of order.lines) {
      console.log(`   Issuing ${line.quantity} ticket(s) for tier: ${line.tierName}`);
      for (let i = 0; i < line.quantity; i++) {
        const ticket = new Ticket({
          event: eventObj._id,
          order: order._id,
          attendee: order.buyer,
          tierSnapshot: {
            tierId: line.tierId,
            name: line.tierName,
            type: line.tierType,
            price: line.unitPrice,
          },
          attendeeInfo: {
            name: order.billingInfo.name,
            email: order.billingInfo.email,
            phone: order.billingInfo.phone || "",
          },
        });
        await ticket.save();

        ticket.qrPayload = await QRCode.toDataURL(
          JSON.stringify({ 
            ticketId: ticket._id.toString(), 
            ticketCode: ticket.ticketCode, 
            eventId: eventObj._id.toString() 
          }),
          { width: 320, margin: 2 }
        );
        await ticket.save();
        issuedTickets.push(ticket);
      }
    }

    // Save issued tickets to the order
    order.tickets = issuedTickets.map((t) => t._id);
    await order.save();

    // Increment event count
    const totalSold = order.lines.reduce((s, l) => s + l.quantity, 0);
    await Event.findByIdAndUpdate(eventObj._id, { $inc: { totalSold } });
    for (const line of order.lines) {
      await Event.findOneAndUpdate(
        { _id: eventObj._id, "ticketTiers._id": line.tierId },
        { $inc: { "ticketTiers.$.sold": line.quantity } }
      );
    }

    console.log(`✅ Order marked as confirmed. Tickets created.`);

    // Send confirmation email
    console.log("✉️ Dispatching ticket confirmation email via Nodemailer...");
    const buyerUser = await User.findById(order.buyer).select("name");
    const emailResult = await sendTicketEmail({
      to: order.billingInfo.email,
      order: { orderNumber: order.orderNumber, total: order.total },
      tickets: issuedTickets,
      event: eventObj,
      buyerName: buyerUser?.name || order.billingInfo.name,
    });

    if (emailResult.ok) {
      console.log("📧 Ticket email successfully queued/dispatched.");
    } else {
      console.warn("⚠️ Nodemailer email warning:", emailResult.error);
    }

    console.log(`\n🎉 Webhook Simulation complete! Order ${order.orderNumber} is now fully confirmed.`);
  } catch (error) {
    console.error("\n❌ Error running checkout simulation:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

run();
