const router = require("express").Router();
const { sendSupportTicketEmail } = require("../utils/email");
const { body, validationResult } = require("express-validator");

const supportRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("message").trim().notEmpty().withMessage("Message is required"),
];

/**
 * @route  POST /api/support
 * @desc   Submit a real support ticket and send a Nodemailer notification email
 * @access Public
 */
router.post("/", supportRules, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      details: errors.array().map(err => ({
        msg: err.msg,
        path: err.path || err.param // handle both express-validator versions
      }))
    });
  }

  const { name, email, subject, message } = req.body;
  try {
    const result = await sendSupportTicketEmail({ name, email, subject, message });
    if (result.ok) {
      return res.status(200).json({
        success: true,
        message: "Your message has been sent successfully. We will get back to you shortly!"
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to dispatch email notification: " + (result.error || "Unknown transport error")
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
