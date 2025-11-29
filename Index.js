// Simple CloudPRNT server for Aldo's kiosk

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Here we store the last ticket text sent by the kiosk
let lastTicket = null;

// =============== HOME (FOR TESTING IN BROWSER) ===============
app.get("/", (req, res) => {
  res.send("✅ Aldo's CloudPRNT kiosk server is running.");
});

// =============== CLOUDPRNT STATUS ENDPOINT ===================
// Star printer calls this to know if there is a job waiting
app.get("/cloudprnt/status", (req, res) => {
  res.json({
    jobReady: !!lastTicket,
    message: lastTicket
      ? "Ticket waiting for printer."
      : "Server online, no jobs in queue."
  });
});

// =============== CLOUDPRNT JOB ENDPOINT ======================
// Star printer calls this to fetch the actual job
app.get("/cloudprnt/job", (req, res) => {
  if (!lastTicket) {
    return res.json({ jobReady: false });
  }

  // ESC/POS control codes
  const ESC = "\x1B";
  const GS  = "\x1D";

  // Build ESC/POS ticket with header + body (lastTicket) + footer
  const escpos =
    ESC + "@"
    + ESC + "!" + "\x38"          // double-size text for the title
    + "ALDO'S PIZZERIA\n"
    + "------------------------------\n"
    + lastTicket + "\n"
    + "------------------------------\n"
    + "Thank you!\n"
    + ESC + "d" + "\x03"          // feed some lines
    + GS + "V" + "\x00";          // full cut

  // After building the job, clear the stored ticket
  lastTicket = null;

  console.log("📨 Sending ESC/POS job to printer.");

  res.json({
    jobReady: true,
    job: {
      type: "escpos",
      data: Buffer.from(escpos, "utf8").toString("base64")
    }
  });
});

// =============== KIOSK SUBMIT ENDPOINT =======================
// Your kiosk (GitHub Pages app) calls this URL with POST /submit
// body: { ticket: "ticket text here..." }
app.post("/submit", (req, res) => {
  const { ticket } = req.body;

  if (!ticket || typeof ticket !== "string") {
    console.log("❌ Invalid /submit payload:", req.body);
    return res.status(400).json({ error: "Missing ticket text" });
  }

  lastTicket = ticket;

  console.log("🧾 New ticket received from kiosk:");
  console.log(ticket);

  res.json({
    success: true,
    message: "Ticket stored, printer will fetch it."
  });
});

// =============== 404 HANDLER (OPTIONAL) ======================
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// =============== START SERVER ================================
app.listen(PORT, () => {
  console.log(`🚀 Aldo's CloudPRNT kiosk server listening on port ${PORT}`);
});
