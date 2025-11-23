const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let lastOrder = null;

// ✔ CloudPRNT ENDPOINT — The printer asks your server for the latest job
app.get("/cloudprnt", (req, res) => {
  if (!lastOrder) {
    return res.json({
      jobReady: false
    });
  }

  const ESC = "\x1B";
  const GS = "\x1D";

  const escpos =
    ESC + "@"
    + ESC + "!" + "\x38"
    + "ALDO'S PIZZERIA\n"
    + ESC + "!" + "\x00"
    + "--------------------------\n"
    + lastOrder
    + "\n--------------------------\n"
    + "Thank you!\n"
    + ESC + "d" + "\x03"
    + GS + "V" + "\x00";

  lastOrder = null;

  res.json({
    jobReady: true,
    job: {
      type: "escpos",
      data: Buffer.from(escpos).toString("base64")
    }
  });
});

// ✔ Endpoint where your APP sends the ticket text
app.post("/submit", (req, res) => {
  const { ticket } = req.body;

  if (!ticket) {
    return res.status(400).json({ error: "Missing ticket text" });
  }

  lastOrder = ticket;

  console.log("Ticket received:");
  console.log(ticket);

  res.json({ success: true, message: "Ticket stored, printer will fetch it." });
});

// ✔ Welcome message
app.get("/", (req, res) => {
  res.send("Aldo's CloudPRNT server is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
