// index.js  — Aldo's CloudPRNT server

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Aquí guardamos el último ticket que mandó el kiosco
let lastTicket = null;

/**
 * 1) ENDPOINT PARA LA IMPRESORA: /cloudprnt
 * La impresora llama aquí para preguntar si hay un trabajo nuevo.
 */
app.get("/cloudprnt", (req, res) => {
  if (!lastTicket) {
    // No hay nada que imprimir todavía
    return res.json({ jobReady: false });
  }

  // Comandos ESC/POS básicos
  const ESC = "\x1B";
  const GS = "\x1D";

  const escpos =
    ESC + "@"
    + ESC + "!" + "\x38"           // Texto grande para el título
    + "* ALDO'S PIZZERIA\n"
    + ESC + "!" + "\x00"           // Volver a tamaño normal
    + "------------------------------\n"
    + lastTicket + "\n"
    + "------------------------------\n"
    + "Thank you!\n"
    + ESC + "d" + "\x03"           // Alimentar papel
    + GS + "V" + "\x00";           // Corte parcial

  // Limpiamos el ticket después de entregarlo
  lastTicket = null;

  return res.json({
    jobReady: true,
    job: {
      type: "escpos",
      data: Buffer.from(escpos).toString("base64")
    }
  });
});

/**
 * 2) ENDPOINT PARA EL KIOSCO: /submit
 * Tu app de GitHub Pages manda aquí el texto del ticket.
 */
app.post("/submit", (req, res) => {
  // Aceptamos dos formatos por si acaso:
  // { ticket: "..." }  (nuevo)
  // { content: "..." } (viejo)
  const { ticket, content, deviceId } = req.body || {};
  const txt = ticket || content;

  if (!txt) {
    console.error("❌ /submit sin ticket:", req.body);
    return res.status(400).json({ error: "Missing ticket text" });
  }

  lastTicket = txt;

  console.log("✅ New ticket received from kiosk.");
  if (deviceId) console.log("Device ID:", deviceId);
  console.log("Ticket text:\n", txt);

  return res.json({
    ok: true,
    message: "Ticket stored. Printer will fetch it."
  });
});

/**
 * 3) ENDPOINT DE SALUD / PRUEBA
 */
app.get("/", (req, res) => {
  res.send("✅ Aldo's CloudPRNT server is running.");
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Aldo's CloudPRNT server listening on port ${PORT}`);
});

module.exports = app;
