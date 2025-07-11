import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // doit être déclaré avant app.use()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// pour servir les fichiers statiques depuis le dossier actuel
app.use(express.static(__dirname));

// Proxy vers la vraie API
app.get('/status/anti', async (req, res) => {
  try {
    const response = await fetch('http://51.75.118.18:20052/status');
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).send({ online: false });
  }
});

app.get('/status/gestion', async (req, res) => {
  try {
    const response = await fetch('http://147.135.213.131:20117/status');
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).send({ online: false });
  }
});


// Route racine
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
// Connexion à MongoDB
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/discordbotdb";
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connecté"))
.catch(err => console.error("Erreur MongoDB:", err));

// Schémas Mongoose
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

// Route contact
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }
  try {
    const contact = new Contact({ name, email, message });
    await contact.save();
    res.json({ success: true, message: "Merci pour votre message, nous vous répondrons bientôt !" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// Route achat licence
app.post("/buy", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: "Nom et email requis." });
  }
  try {
    const licenseKey = crypto.randomBytes(8).toString("hex").toUpperCase();

    let client = await Client.findOne({ email });
    if (!client) {
      client = new Client({ name, email, licenses: [licenseKey] });
    } else {
      client.licenses.push(licenseKey);
    }
    await client.save();

    res.json({ success: true, message: "Achat réussi !", license: licenseKey });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// Route API récupération licences
app.get("/api/licenses/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const client = await Client.findOne({ email });
    if (!client) return res.status(404).json({ success: false, message: "Client non trouvé." });
    res.json({ success: true, licenses: client.licenses });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// Route Stripe
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: "SA Anti-Raid Premium",
          },
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

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
