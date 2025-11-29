// index.js – Aldo's CloudPRNT backend

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // parse JSON body

// Here we store the last ticket text sent by the kiosk
let lastOrder = null;

// ================= CLOUDPRNT ENDPOINT =================
// The printer calls this URL to ask if there is a job ready.
// Configure the printer CloudPRNT URL as:
//   https://aldos-printcore-server-1.onrender.com/cloudprnt
app.get("/cloudprnt", (req, res) => {
  if (!lastOrder) {
    // No job waiting
    return res.json({ jobReady: false });
  }

  // ESC/POS control bytes
  const ESC = "\x1B";
  const GS  = "\x1D";

  // Build ESC/POS ticket text
  const escpos =
    ESC + "@"
    + ESC + "!" + "\x38"
    + "ALDO'S PIZZERIA\n"
    + ESC + "!" + "\x00"
    + "-----------------------------\n"
    + lastOrder + "\n"
    + "-----------------------------\n"
    + "Thank you!\n"
    + ESC + "d" + "\x03"
    + GS + "V" + "\x00";

  // Clear memory after giving the job to the printer
  lastOrder = null;

  // Send job to printer in CloudPRNT format
  res.json({
    jobReady: true,
    job: {
      type: "escpos",
      data: Buffer.from(escpos, "binary").toString("base64")
    }
  });
});

// ================= KIOSK SUBMIT ENDPOINT =================
// This is the URL your kiosk app.js is calling:
//   POST https://aldos-printcore-server-1.onrender.com/submit
app.post("/submit", (req, res) => {
  const { ticket, deviceId } = req.body || {};

  if (!ticket) {
    console.error("POST /submit – missing ticket text. Body:", req.body);
    return res
      .status(400)
      .json({ success: false, error: "Missing ticket text" });
  }

  // Save ticket in memory so the printer can fetch it
  lastOrder = ticket;

  console.log("✅ Ticket received from kiosk.");
  if (deviceId) {
    console.log("Device ID:", deviceId);
  }
  console.log("Ticket content:\n", ticket);

  res.json({
    success: true,
    message: "Ticket stored, printer will fetch it."
  });
});

// ================= HEALTH / ROOT =================
app.get("/", (req, res) => {
  res.send("✅ Aldo's CloudPRNT server is running.");
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Aldo's CloudPRNT server listening on port ${PORT}`);
});
