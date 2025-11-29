// index.js
// Simple CloudPRNT server for Aldo's

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// We store the last ticket text here
let lastOrder = null;

/**
 * 1) CLOUDPRNT ENDPOINT
 * The printer calls this URL to ask:
 *  - "Is there a job ready?"
 *  - If yes, it receives the ESC/POS ticket in base64
 *
 * In the printer, put this as the **Server URL**:
 *   https://TU-SERVIDOR.onrender.com/cloudprnt
 */
app.get("/cloudprnt", (req, res) => {
  if (!lastOrder) {
    return res.json({
      jobReady: false
    });
  }

  // ESC/POS commands
  const ESC = "\x1B";
  const GS = "\x1D";

  const escpos =
    ESC + "@" +                       // initialize
    ESC + "!" + "\x38" +              // double size bold for title
    "ALDO'S PIZZERIA\n" +
    ESC + "!" + "\x00" +              // normal size
    lastOrder + "\n" +
    "\n------------------------------\n" +
    "Thank you!\n" +
    ESC + "d" + "\x03" +              // feed 3 lines
    GS + "V" + "\x00";                // cut

  // Clear buffer so next time there is no job
  lastOrder = null;

  return res.json({
    jobReady: true,
    job: {
      type: "escpos",
      data: Buffer.from(escpos, "utf8").toString("base64")
    }
  });
});

/**
 * 2) SUBMIT ENDPOINT
 * Your kiosk (app.js) sends the ticket text here.
 *
 * In app.js you already have:
 *   const CLOUDPRNT_ENDPOINT = "https://TU-SERVIDOR.onrender.com/submit";
 *   // sendToKitchen() hace POST { ticket: ticketText }
 */
app.post("/submit", (req, res) => {
  const { ticket } = req.body;

  if (!ticket || typeof ticket !== "string") {
    return res.status(400).json({ error: "Missing ticket text" });
  }

  console.log("✅ New ticket received from kiosk:");
  console.log(ticket);

  lastOrder = ticket;

  return res.json({
    success: true,
    message: "Ticket stored, printer will fetch it."
  });
});

/**
 * 3) HOME / HEALTHCHECK
 * Useful to check from the browser that the server is running.
 */
app.get("/", (req, res) => {
  res.send("✅ Aldo's CloudPRNT server is running.");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aldo's CloudPRNT server listening on port ${PORT}`);
});
