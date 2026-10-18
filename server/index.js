// Tillie server
// Routes:
//   POST /detect   -> sends a screenshot to Gemini, returns the clothing items in it
//   POST /tryon    -> Gemini image model puts the Studio outfit on your own photo
//   GET  /similar  -> returns similar items (from products.json) for one detected item
//   POST /orders   -> saves a Tillie order + what it taught us about your sizes (MongoDB Atlas)
//   GET  /orders   -> recent orders · GET /fit -> learned sizes per brand
//
// Run it with:  npm start   (from the server folder)

import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const PORT = process.env.PORT || 3000;
// Gemini model names change often. If this one errors, copy the current
// model name from https://ai.google.dev/gemini-api/docs/image-understanding
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const CATEGORIES = ["outerwear", "top", "bottom", "shoes", "accessory"];

const products = JSON.parse(readFileSync(new URL("./products.json", import.meta.url), "utf8"));

if (!process.env.GEMINI_API_KEY) {
  console.warn("\n⚠  No GEMINI_API_KEY found. Copy .env.example to .env and paste your key in.\n");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// MongoDB Atlas (optional): set MONGODB_URI in .env to store orders and fit memory in the cloud
let db = null;
if (process.env.MONGODB_URI) {
  const client = new MongoClient(process.env.MONGODB_URI);
  client
    .connect()
    .then(() => {
      db = client.db(process.env.MONGODB_DB || "tillie");
      console.log("Connected to MongoDB Atlas");
    })
    .catch((err) => console.warn("MongoDB not connected:", err.message));
} else {
  console.warn("No MONGODB_URI set. Orders will only be saved on the phone.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" })); // screenshots are big

// Quick check that the server is up: open http://localhost:3000 in a browser
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Tillie server is running", model: MODEL, database: db ? "MongoDB Atlas connected" : "not connected" });
});

const DETECT_PROMPT = `You are a fashion assistant. Look at this screenshot and list every
clothing item and accessory a person is wearing or that is being shown for sale.

Reply with JSON only. No markdown, no explanation. Use exactly this shape:
[
  {
    "category": "outerwear" | "top" | "bottom" | "shoes" | "accessory",
    "name": "short name, e.g. white linen button-up shirt",
    "color": "the main color as a hex code, e.g. #F4F1EA",
    "colorName": "plain color name, e.g. off-white",
    "searchQuery": "a shopping search phrase someone would type to find this item"
  }
]

Rules:
- Jackets, coats, blazers and vests count as "outerwear".
- Dresses and jumpsuits count as "top".
- Bags, jewelry, hats, belts, sunglasses count as "accessory".
- If there is no clothing in the image, reply with [].`;

// Gemini sometimes wraps JSON in ``` fences or adds a sentence. Pull out the array.
function parseItems(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  const raw = JSON.parse(text.slice(start, end + 1));
  return raw
    .filter((it) => it && it.name)
    .map((it, i) => ({
      id: `d${Date.now()}-${i}`,
      category: CATEGORIES.includes(String(it.category).toLowerCase())
        ? String(it.category).toLowerCase()
        : "accessory",
      name: String(it.name),
      color: /^#[0-9a-f]{6}$/i.test(it.color) ? it.color : "#B8B0A8",
      colorName: it.colorName ? String(it.colorName) : "",
      searchQuery: it.searchQuery ? String(it.searchQuery) : String(it.name),
    }));
}

app.post("/detect", async (req, res) => {
  const { image, mimeType } = req.body || {};
  if (!image) return res.status(400).json({ error: "No image was sent." });

  try {
    const result = await ai.interactions.create({
      model: MODEL,
      input: [
        { type: "text", text: DETECT_PROMPT },
        { type: "image", data: image, mime_type: mimeType || "image/jpeg" },
      ],
    });
    const items = parseItems(result.output_text || "");
    console.log(`Detected ${items.length} item(s):`, items.map((i) => i.name).join(", "));
    res.json({ items });
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ error: "Gemini could not read this image. " + err.message });
  }
});

// ---- "See it on me": Gemini image model dresses YOUR photo in the outfit ----
// Image model names change often. If this one errors, copy a current image model
// name from Google AI Studio and set GEMINI_IMAGE_MODEL in .env
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";

function tryOnPrompt(items) {
  const list = items
    .map((it) => `- ${it.layer ? it.layer + ": " : ""}${it.colorName || ""} ${it.name}${it.retailer ? ` (${it.retailer})` : ""}`.replace(/\s+/g, " "))
    .join("\n");
  return `Virtual try-on. The first image is a photo of a person. Edit it so the SAME person
is wearing this outfit, layered in this order (outermost first):
${list}

Rules:
- Keep the person's face, hair, skin tone, body shape, pose and the background exactly the same.
- Replace only their clothing. Make the clothes fit their body naturally with realistic folds and lighting.
- Match each item's color and style as closely as possible.
- Any extra images after the first are product photos of the items. Copy their look.
- Return one photorealistic image, full body if the photo allows.`;
}

app.post("/tryon", async (req, res) => {
  const { photo, mimeType, items = [], productImages = [] } = req.body || {};
  if (!photo) return res.status(400).json({ error: "No photo was sent." });
  if (!items.length) return res.status(400).json({ error: "The outfit is empty." });

  const input = [
    { type: "text", text: tryOnPrompt(items) },
    { type: "image", data: photo, mime_type: mimeType || "image/jpeg" },
    ...productImages.slice(0, 4).map((p) => ({ type: "image", data: p.data, mime_type: p.mimeType || "image/jpeg" })),
  ];

  try {
    let result;
    try {
      result = await ai.interactions.create({ model: IMAGE_MODEL, input, response_format: { type: "image", aspect_ratio: "3:4" } });
    } catch (first) {
      // older image models only accept response_modalities
      console.warn("Retrying try-on with response_modalities:", first.message);
      result = await ai.interactions.create({ model: IMAGE_MODEL, input, response_modalities: ["text", "image"] });
    }
    const img = result.output_image;
    if (!img?.data) {
      return res.status(502).json({ error: "Gemini didn't return an image. " + (result.output_text || "Try a clearer full-body photo.") });
    }
    console.log(`Try-on done with ${items.length} item(s)`);
    res.json({ image: img.data, mimeType: img.mime_type || "image/png" });
  } catch (err) {
    console.error("Try-on error:", err.message);
    res.status(500).json({ error: "Gemini couldn't make the try-on. " + err.message });
  }
});

// Distance between two hex colors, used to put the closest colors first
function colorDistance(a, b) {
  const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

app.get("/similar", (req, res) => {
  const { category = "top", color = "#888888", q = "" } = req.query;
  // closest color first (each product can come in several colors)
  const closest = (p) => Math.min(...p.colors.map((c) => colorDistance(c, color)));
  const items = products
    .filter((p) => p.category === category)
    .sort((a, b) => closest(a) - closest(b));
  const shoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`;
  res.json({ items, shoppingUrl });
});

// ---- Orders + fit memory (MongoDB Atlas) ----
app.post("/orders", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  const { userId = "demo-user", order } = req.body || {};
  if (!order?.id) return res.status(400).json({ error: "No order sent" });
  try {
    await db.collection("orders").insertOne({ ...order, userId, savedAt: new Date() });
    // every purchase teaches Tillie your size at that brand
    const fits = (order.items || [])
      .filter((i) => ["top", "outerwear", "bottom"].includes(i.category))
      .map((i) => ({ userId, retailer: i.retailer, size: i.size, category: i.category, productId: i.productId, at: new Date() }));
    if (fits.length) await db.collection("fit_memory").insertMany(fits);
    res.json({ ok: true, saved: order.id, learned: fits.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  const userId = req.query.userId || "demo-user";
  const orders = await db.collection("orders").find({ userId }).sort({ savedAt: -1 }).limit(20).toArray();
  res.json({ orders });
});

app.get("/fit", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  const userId = req.query.userId || "demo-user";
  const fits = await db.collection("fit_memory").find({ userId }).sort({ at: -1 }).limit(50).toArray();
  res.json({ fits });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nTillie server running on port ${PORT}`);
  console.log(`Test it: open http://localhost:${PORT} in your browser`);
  console.log(`Phone: set SERVER_URL in app/src/config.js to http://<your-laptop-IP>:${PORT}\n`);
});
