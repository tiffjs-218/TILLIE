import { Platform, StatusBar } from "react-native";

// Tillie design system: "digital wardrobe" Y2K look from the team's Canva template.
// Pastel lavender/pink gradient, hot pink + steel blue, periwinkle and butter-yellow folder tabs,
// pixel type + script type, retro computer windows.
export const colors = {
  bg: "#F6F1F8", // pale lavender-pink
  bg2: "#ECEFFC", // pale periwinkle (gradient end)
  card: "#FFFFFF",
  ink: "#1F4C7A", // steel blue: headings, selected states
  ink2: "#1E2433", // near-black body text
  muted: "#6A6F88",
  line: "#E3DEF0",
  chipLine: "#BCC6F4",
  soft: "#DDE3FB", // periwinkle panel
  soft2: "#BCC6F4", // periwinkle tab
  pinkTab: "#F9D6F5", // pink folder tab
  butter: "#F6EFBD", // butter folder tab
  yellow: "#F3DD7A", // Tillie T orb
  yellowSoft: "rgba(243, 221, 122, 0.72)",
  pink: "#DD3FB0", // hot pink
  pinkSoft: "#FBE3F4",
  stage: "#DDE3FB",
  mannequin: "#F4F4F2",
  mannequinShade: "#DADBD9",
  skin: "#F4F4F2",
  hair: "#E9E6DF",
  danger: "#C0264E",
  success: "#1F7A4D",
  accent: "#DD3FB0",
  accentSoft: "#FBE3F4",
  lavender: "#DDE3FB",
  lavenderInk: "#1F4C7A",
};

export const fonts = {
  regular: "Raleway_400Regular",
  medium: "Raleway_500Medium",
  semibold: "Raleway_600SemiBold",
  bold: "Raleway_700Bold",
  pixel: "VT323_400Regular", // retro pixel type
  script: "PinyonScript_400Regular", // fancy script type
  serifItalic: "PinyonScript_400Regular",
  serifItalicBold: "PinyonScript_400Regular",
};

// Layer order from outside to inside is set in the Studio. This is the default.
export const CATEGORIES = [
  { key: "outerwear", label: "Outerwear", short: "Outer" },
  { key: "top", label: "Tops", short: "Top" },
  { key: "bottom", label: "Bottoms", short: "Bottom" },
  { key: "shoes", label: "Shoes", short: "Shoes" },
  { key: "accessory", label: "Accessories", short: "Acc." },
];

export const categoryLabel = (key) => (CATEGORIES.find((c) => c.key === key) || { label: key }).label;

// Studio layers, outermost first. Every piece is put in a layer automatically.
export const SLOTS = [
  { key: "outer", label: "Outer layer", short: "Outer" },
  { key: "mid", label: "Mid layer", short: "Mid" },
  { key: "inner", label: "Inner layer", short: "Inner" },
  { key: "bottom", label: "Bottoms", short: "Bottom" },
  { key: "shoes", label: "Shoes", short: "Shoes" },
  { key: "accessory", label: "Accessories", short: "Acc." },
];
export const DEFAULT_ORDER = SLOTS.map((s) => s.key);
export const slotLabel = (key) => (SLOTS.find((s) => s.key === key) || { label: key }).label;

const MID_WORDS = /sweater|knit|cardigan|pullover|hoodie|sweatshirt|fleece|crewneck/i;
// inner = tees, tanks, shirts · mid = sweaters/cardigans · outer = jackets, coats, blazers, vests
export function slotOf(piece) {
  if (piece.category === "outerwear") return "outer";
  if (piece.category === "top") return MID_WORDS.test(piece.name) ? "mid" : "inner";
  return piece.category;
}

// Build an outfit object (keyed by layer) from a list of pieces
export const lookOf = (...pieces) => Object.fromEntries(pieces.filter(Boolean).map((p) => [slotOf(p), p]));

// Closet collections, sorted automatically from the item's type and name
const COLLECTIONS = [
  { key: "summer-tops", label: "Summer tops", test: (p) => p.category === "top" && /linen|tee|tank|cami|crop|ribbed|baby/i.test(p.name) && !MID_WORDS.test(p.name) },
  { key: "everyday-tops", label: "Everyday tops", test: (p) => p.category === "top" && !MID_WORDS.test(p.name) },
  { key: "cozy-knits", label: "Cozy knits", test: (p) => p.category === "top" },
  { key: "winter-coats", label: "Winter coats", test: (p) => p.category === "outerwear" && /coat|puffer|wool|vest|parka|trench/i.test(p.name) },
  { key: "light-jackets", label: "Light jackets", test: (p) => p.category === "outerwear" },
  { key: "jeans", label: "Jeans", test: (p) => p.category === "bottom" && /jean|denim/i.test(p.name) && !/skirt/i.test(p.name) },
  { key: "skirts", label: "Skirts", test: (p) => p.category === "bottom" && /skirt/i.test(p.name) },
  { key: "pants", label: "Pants & sweats", test: (p) => p.category === "bottom" },
  { key: "sneakers", label: "Sneakers", test: (p) => p.category === "shoes" && /sneaker|low-top|trainer/i.test(p.name) },
  { key: "boots", label: "Boots", test: (p) => p.category === "shoes" && /boot/i.test(p.name) },
  { key: "flats", label: "Flats & loafers", test: (p) => p.category === "shoes" },
  { key: "bags", label: "Bags", test: (p) => p.category === "accessory" && /bag|tote/i.test(p.name) },
  { key: "jewelry", label: "Jewelry", test: (p) => p.category === "accessory" },
];
export const COLLECTION_ORDER = COLLECTIONS.map((c) => ({ key: c.key, label: c.label }));
export const collectionOf = (piece) => (COLLECTIONS.find((c) => c.test(piece)) || { key: "other", label: "Other" });

// Space for the phone's status bar at the top of each screen
export const TOP_INSET = Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 24) + 8;

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Store link for an item: Google Shopping for that item at that retailer
export const shopUrl = (item) =>
  `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${item.name} ${item.retailer || ""}`)}`;

// One piece of clothing the user picked: a product + chosen color + size
export const makePiece = (product, colorIndex = 0, size) => ({
  uid: `${product.id}-${colorIndex}-${size || product.sizes[0]}`,
  productId: product.id,
  name: product.name,
  retailer: product.retailer,
  price: product.price,
  category: product.category,
  color: product.colors[colorIndex],
  colorName: product.colorNames[colorIndex],
  size: size || product.sizes[0],
});
