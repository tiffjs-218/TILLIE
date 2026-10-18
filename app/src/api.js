// Everything that talks to the server lives here.
import { SERVER_URL, USE_DEMO_FALLBACK } from "./config";
import products from "./data/products.json";

// Sample results used when the server can't be reached (keeps the demo alive)
import { SAMPLE_LOOK } from "./data/seed";
const DEMO_DETECTED = SAMPLE_LOOK.detected;

async function fetchWithTimeout(url, options = {}, ms = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Send a screenshot (base64) to Gemini through the server.
// Returns { items, demo, error }
export async function detectClothes(base64, mimeType = "image/jpeg") {
  try {
    const res = await fetchWithTimeout(
      `${SERVER_URL}/detect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      },
      45000
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return { items: data.items || [], demo: false };
  } catch (err) {
    if (!USE_DEMO_FALLBACK) throw err;
    return { items: DEMO_DETECTED, demo: true, error: err.message };
  }
}

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16) || 0);
}
function colorDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Similar items for one detected item. Returns { items, shoppingUrl }
export async function findSimilar(item) {
  const params = `category=${encodeURIComponent(item.category)}&color=${encodeURIComponent(
    item.color
  )}&q=${encodeURIComponent(item.searchQuery || item.name)}`;
  try {
    const res = await fetchWithTimeout(`${SERVER_URL}/similar?${params}`, {}, 10000);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return await res.json();
  } catch (err) {
    // Same logic as the server, done on the phone
    const closest = (p) => Math.min(...p.colors.map((c) => colorDistance(c, item.color)));
    const items = products
      .filter((p) => p.category === item.category)
      .sort((a, b) => closest(a) - closest(b));
    return {
      items,
      shoppingUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.searchQuery || item.name)}`,
    };
  }
}

// Save an order to the cloud (MongoDB Atlas via the server). Never blocks checkout:
// if the server is offline, the order is still saved on the phone.
export async function syncOrder(order) {
  try {
    const res = await fetchWithTimeout(
      `${SERVER_URL}/orders`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo-user", order }) },
      8000
    );
    return res.ok;
  } catch {
    return false;
  }
}

// "See it on me": send your photo + the Studio outfit to Gemini's image model.
// Returns { uri } (a data URI you can put in <Image>). Throws a friendly error on failure.
export async function tryOnOutfit(photoBase64, mimeType, pieces) {
  const items = pieces.map((p) => ({
    name: p.name, colorName: p.colorName, retailer: p.retailer, category: p.category, layer: p.layer,
  }));
  let res;
  try {
    res = await fetchWithTimeout(
      `${SERVER_URL}/tryon`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: photoBase64, mimeType, items }) },
      120000
    );
  } catch (err) {
    throw new Error("Couldn't reach the Tillie server. Check SERVER_URL in config.js and that the server is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.image) throw new Error(data.error || `Server error ${res.status}`);
  return { uri: `data:${data.mimeType || "image/png"};base64,${data.image}` };
}
