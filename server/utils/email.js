const nodemailer = require("nodemailer");

// ─── Transporter singleton ────────────────────────────────────────────────────

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    // Production SMTP (Gmail, SendGrid, etc.)
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dev: auto-create Ethereal test account (catches outgoing email, never delivers)
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`📧 [email] Using Ethereal test account: ${testAccount.user}`);
    console.log(`📧 [email] Preview at: https://ethereal.email`);
  }

  return _transporter;
}

// ─── HTML email template ──────────────────────────────────────────────────────

function buildTicketEmail({ order, tickets, event, buyerName }) {
  const eventDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "TBA";

  const ticketBlocks = tickets.map((t) => `
    <div style="background:#0d1f2d;border:1px solid rgba(255,255,255,0.1);border-radius:16px;margin-bottom:16px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:16px;padding:16px;">
        ${t.qrPayload ? `<img src="${t.qrPayload}" width="120" height="120" style="border-radius:8px;flex-shrink:0;" alt="QR Code" />` : ""}
        <div>
          <p style="color:#00d26a;font-family:monospace;font-size:18px;font-weight:bold;margin:0 0 6px;">${t.ticketCode}</p>
          <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 4px;">${t.tierSnapshot?.name ?? "Ticket"}</p>
          <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">${buyerName}</p>
          <span style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:20px;background:rgba(0,210,106,0.1);color:#00d26a;font-size:11px;font-weight:600;">✓ Valid</span>
        </div>
      </div>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Tickets — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="width:36px;height:36px;background:#00d26a;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:#0c2230;font-size:20px;font-weight:bold;">🎫</span>
        </div>
        <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
          Event<span style="color:#00d26a;">Nest</span>
        </span>
      </div>
    </div>

    <!-- Hero -->
    <div style="background:#0d1f2d;border:1px solid rgba(0,210,106,0.2);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(0,210,106,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">✅</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Booking Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0;">
        Order <span style="color:#ffffff;font-family:monospace;">${order.orderNumber}</span>
      </p>
    </div>

    <!-- Event Details -->
    <div style="background:#0d1f2d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
      <h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px;">${event.title ?? "Your Event"}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:6px 0;">📅 Date</td>
          <td style="color:#ffffff;font-size:13px;text-align:right;">${eventDate}</td>
        </tr>
        ${event.venue ? `
        <tr>
          <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:6px 0;">📍 Venue</td>
          <td style="color:#ffffff;font-size:13px;text-align:right;">${event.venue.name}, ${event.venue.city}</td>
        </tr>` : ""}
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:10px 0 6px;">💳 Total Paid</td>
          <td style="color:#00d26a;font-size:16px;font-weight:700;text-align:right;">$${order.total?.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Tickets -->
    <h3 style="color:#ffffff;font-size:15px;font-weight:700;margin:0 0 12px;">
      Your Ticket${tickets.length > 1 ? "s" : ""} (${tickets.length})
    </h3>
    ${ticketBlocks}

    <!-- Instructions -->
    <div style="background:rgba(0,210,106,0.05);border:1px solid rgba(0,210,106,0.15);border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#00d26a;font-size:13px;font-weight:600;margin:0 0 8px;">📱 At the event</p>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;line-height:1.6;">
        Show the QR code above to the staff at the entrance. Each ticket has a unique code — one scan per ticket.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/tickets"
        style="display:inline-block;background:#00d26a;color:#0c2230;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
        View My Tickets →
      </a>
    </div>

    <!-- Footer -->
    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      EventNest · Questions? Reply to this email.
    </p>
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function sendTicketEmail({ to, order, tickets, event, buyerName }) {
  try {
    const transporter = await getTransporter();
    const html = buildTicketEmail({ order, tickets, event, buyerName });

    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "tickets@eventnest.dev"}>`,
      to,
      subject: `🎫 Your tickets for ${event.title ?? "the event"} — Order ${order.orderNumber}`,
      html,
    });

    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 [email] Preview: ${previewUrl}`);
      }
    }

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    // Never let email failure crash the order flow
    console.error("[email] Failed to send ticket email:", err.message);
    return { ok: false, error: err.message };
  }
}

function buildVerificationEmail({ name, token }) {
  const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Verify Your Email — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;text-align:center;">
    <div style="margin-bottom:32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
        Event<span style="color:#ff5a5f;">Nest</span>
      </span>
    </div>
    <div style="background:#112240;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;margin-bottom:24px;text-align:left;">
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 16px;">Hello ${name},</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;">
        Welcome to EventNest! Please verify your email address to unlock your account and start creating or booking events.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${url}" style="display:inline-block;background:#ff5a5f;color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Verify Email Address
        </a>
      </div>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;line-height:1.6;">
        Or copy and paste this link in your browser:<br/>
        <a href="${url}" style="color:#ff5a5f;text-decoration:none;">${url}</a>
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0;">
      EventNest · If you didn't create an account, you can ignore this email.
    </p>
  </div>
</body>
</html>
  `;
}

function buildPasswordResetEmail({ name, token }) {
  const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reset Your Password — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;text-align:center;">
    <div style="margin-bottom:32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
        Event<span style="color:#ff5a5f;">Nest</span>
      </span>
    </div>
    <div style="background:#112240;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;margin-bottom:24px;text-align:left;">
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 16px;">Hello ${name},</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;">
        We received a request to reset the password for your EventNest account. Click the button below to set a new password. This link is valid for 1 hour.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${url}" style="display:inline-block;background:#ff5a5f;color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Reset Password
        </a>
      </div>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;line-height:1.6;">
        Or copy and paste this link in your browser:<br/>
        <a href="${url}" style="color:#ff5a5f;text-decoration:none;">${url}</a>
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0;">
      EventNest · If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `;
}

async function sendVerificationEmail({ to, name, token }) {
  try {
    const transporter = await getTransporter();
    const html = buildVerificationEmail({ name, token });
    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@eventnest.dev"}>`,
      to,
      subject: "✉️ Verify your email address — EventNest",
      html,
    });
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 [email] Verification email preview: ${previewUrl}`);
      }
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send verification email:", err.message);
    return { ok: false, error: err.message };
  }
}

async function sendPasswordResetEmail({ to, name, token }) {
  try {
    const transporter = await getTransporter();
    const html = buildPasswordResetEmail({ name, token });
    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@eventnest.dev"}>`,
      to,
      subject: "🔒 Reset your password — EventNest",
      html,
    });
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 [email] Password reset email preview: ${previewUrl}`);
      }
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send password reset email:", err.message);
    return { ok: false, error: err.message };
  }
}

async function sendSupportTicketEmail({ name, email, subject, message }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"EventNest Support" <${process.env.SMTP_FROM || process.env.SMTP_USER || "support@eventnest.dev"}>`,
      to: process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "support@eventnest.dev",
      replyTo: `"${name}" <${email}>`,
      subject: `[Support Ticket] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #060f17; color: #ffffff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
          <h2 style="color: #ff5a5f; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">New Support Ticket</h2>
          <p><strong>From:</strong> ${name} (<a href="mailto:${email}" style="color: #ff5a5f; text-decoration: none;">${email}</a>)</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background-color: #0d1f2d; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid rgba(255,255,255,0.05); white-space: pre-wrap; line-height: 1.6;">
            ${message}
          </div>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px;" />
          <p style="font-size: 12px; color: rgba(255,255,255,0.4); text-align: center;">EventNest Support System</p>
        </div>
      `
    });

    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 [support email] Ticket email preview: ${previewUrl}`);
      }
    }
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[email] Failed to send support ticket email:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Refund email ─────────────────────────────────────────────────────────────
function buildRefundEmail({ orderNumber, total, eventTitle, buyerName }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Refund Processed — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
        Event<span style="color:#ff5a5f;">Nest</span>
      </span>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(255,90,95,0.2);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(255,90,95,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">💵</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Refund Processed</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;">
        A refund of <strong>$${total.toFixed(2)}</strong> has been successfully processed for Order <span style="color:#ffffff;font-family:monospace;">${orderNumber}</span>.
      </p>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
      <h2 style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 12px;">Refund Details</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;margin:0;">
        Hello ${buyerName},<br/><br/>
        This email confirms that your refund has been processed by the organizer of <strong>${eventTitle}</strong>. 
        Depending on your banking institution, funds will typically appear in your account within 5 to 10 business days.
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      EventNest · Need help? Reply to this email.
    </p>
  </div>
</body>
</html>`;
}

async function sendRefundEmail({ to, orderNumber, total, eventTitle, buyerName }) {
  try {
    const transporter = await getTransporter();
    const html = buildRefundEmail({ orderNumber, total, eventTitle, buyerName });
    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@eventnest.dev"}>`,
      to,
      subject: `💵 Refund processed for order ${orderNumber} — EventNest`,
      html,
    });
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log(`📧 [email] Refund email preview: ${previewUrl}`);
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send refund email:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Event update email ───────────────────────────────────────────────────────
function buildEventUpdateEmail({ eventTitle, changes, buyerName, eventUrl }) {
  const changesList = Object.entries(changes)
    .map(([key, val]) => `<li><strong>${key}:</strong> ${val}</li>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Event Details Updated — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
        Event<span style="color:#00d26a;">Nest</span>
      </span>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(0,210,106,0.2);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(0,210,106,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">🔔</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Event Update</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;">
        Important updates have been made to <strong>${eventTitle}</strong>.
      </p>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
      <h2 style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 12px;">What Changed?</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;margin:0 0 16px;">
        Hello ${buyerName},<br/><br/>
        The organizer has modified details for your upcoming event. Please review the changes below:
      </p>
      <ul style="color:#ffffff;font-size:13px;line-height:1.6;margin:0 0 20px;padding-left:20px;">
        ${changesList}
      </ul>
      <div style="text-align:center;">
        <a href="${eventUrl}" style="display:inline-block;background:#00d26a;color:#0c2230;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">
          View Event Details
        </a>
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      EventNest · Need help? Reply to this email.
    </p>
  </div>
</body>
</html>`;
}

async function sendEventUpdateEmail({ to, eventTitle, changes, buyerName, eventUrl }) {
  try {
    const transporter = await getTransporter();
    const html = buildEventUpdateEmail({ eventTitle, changes, buyerName, eventUrl });
    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@eventnest.dev"}>`,
      to,
      subject: `🔔 Important update for ${eventTitle} — EventNest`,
      html,
    });
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log(`📧 [email] Event update email preview: ${previewUrl}`);
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send event update email:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Event cancellation email ─────────────────────────────────────────────────
function buildEventCancelledEmail({ eventTitle, buyerName, refundStatus }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Event Cancelled — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
        Event<span style="color:#ff5a5f;">Nest</span>
      </span>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(255,90,95,0.2);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(255,90,95,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">⚠️</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Event Cancelled</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;">
        We regret to inform you that <strong>${eventTitle}</strong> has been cancelled.
      </p>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
      <h2 style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 12px;">Cancellation Notice</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;margin:0;">
        Hello ${buyerName},<br/><br/>
        The event organizer has cancelled this event. Your tickets are no longer valid for check-in.<br/><br/>
        <strong>Refund Status:</strong> ${refundStatus}<br/><br/>
        If you are entitled to a refund, it will be automatically issued back to your original payment method. Contact support if you have any questions.
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      EventNest · Questions? Reply to this email.
    </p>
  </div>
</body>
</html>`;
}

async function sendEventCancelledEmail({ to, eventTitle, buyerName, refundStatus }) {
  try {
    const transporter = await getTransporter();
    const html = buildEventCancelledEmail({ eventTitle, buyerName, refundStatus });
    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@eventnest.dev"}>`,
      to,
      subject: `⚠️ Event Cancelled Notice: ${eventTitle} — EventNest`,
      html,
    });
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log(`📧 [email] Event cancellation email preview: ${previewUrl}`);
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send event cancellation email:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Event reminder email ─────────────────────────────────────────────────────
function buildEventReminderEmail({ event, ticketCode, attendeeName }) {
  const eventDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit"
      })
    : "TBA";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reminder: Event tomorrow! — EventNest</title>
</head>
<body style="margin:0;padding:0;background:#060f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
        Event<span style="color:#00d26a;">Nest</span>
      </span>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(0,210,106,0.2);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(0,210,106,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">⏳</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Event Reminder</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;">
        You have an upcoming event in 24 hours!
      </p>
    </div>
    <div style="background:#0d1f2d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
      <h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px;">${event.title ?? "Your Event"}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:6px 0;">📅 Starts At</td>
          <td style="color:#ffffff;font-size:13px;text-align:right;">${eventDate}</td>
        </tr>
        ${event.venue ? `
        <tr>
          <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:6px 0;">📍 Location</td>
          <td style="color:#ffffff;font-size:13px;text-align:right;">${event.venue.name}, ${event.venue.city}</td>
        </tr>` : ""}
        ${event.isOnline ? `
        <tr>
          <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:6px 0;">💻 Stream Link</td>
          <td style="color:#00d26a;font-size:13px;text-align:right;word-break:break-all;"><a href="${event.onlineLink}" style="color:#00d26a;text-decoration:none;">${event.onlineLink}</a></td>
        </tr>` : ""}
      </table>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 4px;">Ticket Holder</p>
        <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 8px;">${attendeeName}</p>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 4px;">Ticket Code</p>
        <p style="color:#00d26a;font-family:monospace;font-size:15px;font-weight:bold;margin:0;">${ticketCode}</p>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/tickets"
        style="display:inline-block;background:#00d26a;color:#0c2230;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Access My Ticket →
      </a>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:12px;text-align:center;margin:0;">
      EventNest · See you there!
    </p>
  </div>
</body>
</html>`;
}

async function sendEventReminderEmail({ to, event, ticketCode, attendeeName }) {
  try {
    const transporter = await getTransporter();
    const html = buildEventReminderEmail({ event, ticketCode, attendeeName });
    const info = await transporter.sendMail({
      from: `"EventNest" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@eventnest.dev"}>`,
      to,
      subject: `⏳ Tomorrow: Reminder for ${event.title} — EventNest`,
      html,
    });
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log(`📧 [email] Event reminder email preview: ${previewUrl}`);
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send event reminder email:", err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  sendTicketEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSupportTicketEmail,
  sendRefundEmail,
  sendEventUpdateEmail,
  sendEventCancelledEmail,
  sendEventReminderEmail,
};


