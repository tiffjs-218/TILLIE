import { Platform, StatusBar } from "react-native";

// Tillie design system, from the team's Figma Make file ("silver-blue editorial")
export const colors = {
  bg: "#F3F4F7", // silver background
  card: "#FFFFFF",
  ink: "#111318", // near-black text + primary buttons
  ink2: "#252329",
  muted: "#687181", // blue-grey secondary text
  line: "#D9DEE8",
  chipLine: "#B8C0CD",
  soft: "#DCE3EF", // soft blue panels
  soft2: "#CCD5E5",
  yellow: "#F0D273", // Tillie yellow
  yellowSoft: "rgba(240, 210, 115, 0.72)", // translucent logo
  stage: "#E4E7ED", // studio backdrop (grey like the 3D render)
  stageDark: "#C9CDD5",
  mannequin: "#F4F4F2",
  mannequinShade: "#DADBD9",
  skin: "#F4F4F2",
  hair: "#E9E6DF",
  danger: "#B42318",
  success: "#1F7A4D",
  // kept for older components
  accent: "#111318",
  accentSoft: "#F6EAC0",
  lavender: "#DCE3EF",
  lavenderInk: "#3E4757",
};

export const fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  serifItalic: "PlayfairDisplay_600SemiBold_Italic",
  serifItalicBold: "PlayfairDisplay_700Bold_Italic",
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
