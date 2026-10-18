// Tillie's size learning.
// Every brand cuts sizes a little differently (an XS at Zara fits like an S at Aritzia).
// Tillie keeps a size chart per brand, learns your real measurement from sizes you've bought,
// and translates it into the right size at any other brand. Charts here are sample data.

const LETTERS = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

// Standard chart (inches): bust for tops/outerwear, waist for bottoms. XS is index 1.
const STANDARD = { top: { start: 30, step: 2 }, bottom: { start: 23, step: 2 } };

// How each brand runs compared with the standard chart (inches). Negative = runs small.
export const BRAND_OFFSET = {
  Zara: 0,
  "Urban Outfitters": 0,
  Amazon: 0.5,
  Uniqlo: -1,
  "H&M": -0.5,
  Cider: -1,
  Edikted: -2,
  Aritzia: -1.5,
  "Princess Polly": -1,
};

const group = (category) => (category === "bottom" ? "bottom" : category === "top" || category === "outerwear" ? "top" : null);

// The body measurement (inches) a given brand + size is made for
export function sizeToMeasure(brand, size, category) {
  const g = group(category);
  if (!g) return null;
  const offset = BRAND_OFFSET[brand] ?? 0;
  const n = parseFloat(size);
  if (!Number.isNaN(n) && g === "bottom") return n - offset; // numeric jeans size ≈ waist in inches
  const i = LETTERS.indexOf(String(size).toUpperCase());
  if (i < 0) return null;
  return STANDARD[g].start + i * STANDARD[g].step + offset;
}

function toInches(value, unit) {
  const n = parseFloat(value);
  if (!n) return null;
  return unit === "cm" ? n / 2.54 : n;
}

// Your measurement for a category: learned from purchases first, else from your profile
export function myMeasure(category, purchases = [], profile = {}) {
  const g = group(category);
  if (!g) return null;
  const learned = purchases
    .filter((p) => group(p.category) === g)
    .map((p) => ({ ...p, m: sizeToMeasure(p.retailer, p.size, p.category) }))
    .filter((p) => p.m);
  if (learned.length) {
    const avg = learned.reduce((s, p) => s + p.m, 0) / learned.length;
    const last = learned[learned.length - 1];
    return { inches: avg, source: "learned", from: last };
  }
  const fromProfile = g === "top" ? toInches(profile.bust, profile.unit) : toInches(profile.waist, profile.unit);
  if (fromProfile) return { inches: fromProfile, source: "profile", label: g === "top" ? "bust" : "waist" };
  return null;
}

// The best size for you in this product, plus a short explanation
export function recommendSize(product, purchases, profile) {
  if (!group(product.category) || !product.sizes?.length || product.sizes[0] === "One size") return null;
  const me = myMeasure(product.category, purchases, profile);
  if (!me) return null;
  let best = null;
  product.sizes.forEach((sz) => {
    const m = sizeToMeasure(product.retailer, sz, product.category);
    if (m == null) return;
    const d = Math.abs(m - me.inches);
    if (!best || d < best.d) best = { size: sz, d };
  });
  if (!best) return null;
  const reason =
    me.source === "learned"
      ? `Based on your ${me.from.size} at ${me.from.retailer}`
      : `Based on your ${me.label} (${Math.round(me.inches)} in)`;
  return { size: best.size, reason, learned: me.source === "learned" };
}

// For Profile: what a learned size translates to at other brands
export function translations(purchase) {
  const g = group(purchase.category);
  if (!g) return [];
  const m = sizeToMeasure(purchase.retailer, purchase.size, purchase.category);
  if (m == null) return [];
  return Object.keys(BRAND_OFFSET)
    .filter((b) => b !== purchase.retailer)
    .map((brand) => {
      let best = null;
      LETTERS.forEach((sz) => {
        const bm = sizeToMeasure(brand, sz, purchase.category);
        const d = Math.abs(bm - m);
        if (!best || d < best.d) best = { size: sz, d };
      });
      return { brand, size: best.size };
    })
    // brands where your size is different come first — that's where Tillie helps most
    .sort((a, b) => (b.size !== purchase.size) - (a.size !== purchase.size));
}
