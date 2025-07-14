import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import fetch from 'node-fetch';
import cors from "cors";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 3000;

// Connexion MongoDB
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/discordbotdb";
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ Erreur MongoDB:", err));

// Schemas
const clientSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  licenses: [String],
  createdAt: { type: Date, default: Date.now }
});
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const Client = mongoose.model("Client", clientSchema);
const Contact = mongoose.model("Contact", contactSchema);

const visitsFilePath = path.join(__dirname, "visits.json");

// Fonction utilitaire pour lire le compteur
function getVisits() {
  try {
    const data = fs.readFileSync(visitsFilePath, "utf8");
    return JSON.parse(data).totalVisits || 0;
  } catch {
    return 0;
  }
}

// Fonction utilitaire pour sauvegarder le compteur
function saveVisits(count) {
  fs.writeFileSync(visitsFilePath, JSON.stringify({ totalVisits: count }, null, 2));
}

// Route pour incrémenter et renvoyer le compteur
app.get("/api/visits", (req, res) => {
  console.log("GET /api/visits");
  let count = getVisits();
  console.log("visits count:", count);
  count++;
  saveVisits(count);
  res.json({ totalVisits: count });
});

// Routes API statiques
app.use(express.static(__dirname));

// Proxy vers la vraie API status
app.get('/api/status/anti', async (req, res) => {
  try {
    const response = await fetch('http://51.75.118.18:20052/status');
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).send({ online: false });
  }
});

app.get('/api/status/gestion', async (req, res) => {
  try {
    const response = await fetch('http://147.135.213.131:20117/status');
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).send({ online: false });
  }
});

// Dashboard licenses
app.get("/api/licenses/:email", async (req, res) => {
  try {
    const client = await Client.findOne({ email: req.params.email });
    if (!client) return res.status(404).json({ success: false, message: "Client non trouvé." });
    res.json({ success: true, licenses: client.licenses });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// Contact
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  try {
    const contact = new Contact({ name, email, message });
    await contact.save();
    res.json({ success: true, message: "Merci pour votre message, nous vous répondrons bientôt !" });
  } catch {
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// Stripe Checkout
app.post("/create-checkout-session", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requis" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: "SA Anti-Raid Premium" },
          unit_amount: 499,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Une erreur est survenue." });
  }
});

// Stripe webhook
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    if (email) {
      await createLicenseForEmail(email);
    }
  }

  res.json({ received: true });
});

// Statistiques clients
app.get("/api/stats/clients", async (req, res) => {
  try {
    const count = await Client.countDocuments();
    res.json({ total: count });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Statistiques licenses récentes
app.get("/api/stats/licenses", async (req, res) => {
  try {
    const clients = await Client.find({}, { email: 1, licenses: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
})

async function createLicenseForEmail(email) {
  const licenseKey = crypto.randomBytes(8).toString("hex").toUpperCase();
  let client = await Client.findOne({ email });
  if (!client) {
    client = new Client({ email, licenses: [licenseKey] });
  } else {
    client.licenses.push(licenseKey);
  }
  await client.save();
  console.log(`🎉 Licence ${licenseKey} ajoutée pour ${email}`);
}

// Fallback pour ton HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
