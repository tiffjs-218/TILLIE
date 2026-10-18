// Tillie server
// Two routes:
//   POST /detect   -> sends a screenshot to Gemini, returns the clothing items in it
//   GET  /similar  -> returns similar items (from products.json) for one detected item
//
// Run it with:  npm start   (from the server folder)

import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";

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

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" })); // screenshots are big

// Quick check that the server is up: open http://localhost:3000 in a browser
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Tillie server is running", model: MODEL });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nTillie server running on port ${PORT}`);
  console.log(`Test it: open http://localhost:${PORT} in your browser`);
  console.log(`Phone: set SERVER_URL in app/src/config.js to http://<your-laptop-IP>:${PORT}\n`);
});
