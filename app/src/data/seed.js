// Hard-coded demo data: the fake video feed, sample closet, saved outfits and community posts.
// Every detected item points at a real product in products.json (matchId) so the demo is consistent.
import products from "./products.json";
import { makePiece } from "../theme";

const byId = (id) => products.find((p) => p.id === id);
const piece = (id, colorIndex = 0) => makePiece(byId(id), colorIndex);

// A detected item = what "AI" found in the video, linked to its best matching product
function detected(id, matchId, colorIndex, searchQuery) {
  const p = byId(matchId);
  return {
    id,
    matchId,
    category: p.category,
    name: p.name,
    color: p.colors[colorIndex],
    colorName: p.colorNames[colorIndex].toLowerCase(),
    searchQuery,
  };
}

export const DEFAULT_ORDER = ["outerwear", "top", "bottom", "shoes", "accessory"];

// The fake TikTok-style feed on Discover. Detection on these is simulated.
export const FEED = [
  {
    id: "v0",
    creator: "@emelie",
    caption: "fall fits lately 🍂 + ignore my dirty mirror...",
    sound: "Where Life Begins",
    likes: "1,284", comments: "96", saves: "342", shares: "51",
    bg: ["#2E2A27", "#4A423B"],
    // Your own photo. Replace assets/feed/emelie1.jpg with the original from your camera roll for sharper quality.
    image: require("../../assets/feed/emelie1.jpg"),
    outfit: { top: piece("p33"), bottom: piece("p36"), shoes: piece("p13"), accessory: piece("p40") },
    detected: [
      detected("v0-1", "p33", 0, "oatmeal v neck wool sweater women"),
      detected("v0-2", "p36", 0, "cream ecru wide leg jeans women"),
      detected("v0-3", "p40", 0, "brown suede slouchy shoulder bag"),
      detected("v0-4", "p42", 0, "silver pearl bow pendant necklace"),
      detected("v0-5", "p13", 0, "brown suede loafers women"),
    ],
  },
  {
    id: "v1",
    creator: "@maya.styles",
    caption: "fall campus fit, everything under $80 #ootd #uwfashion",
    sound: "original sound - maya.styles",
    likes: "48.2K", comments: "612", saves: "9,104", shares: "1,287",
    bg: ["#3A3442", "#5B4B6B"],
    outfit: { outerwear: piece("p19"), top: piece("p24"), bottom: piece("p06"), shoes: piece("p11"), accessory: piece("p15") },
    detected: [
      detected("v1-1", "p19", 0, "cropped denim jacket women mid wash"),
      detected("v1-2", "p24", 0, "cream cable knit sweater women"),
      detected("v1-3", "p06", 0, "light wash 90s straight leg jeans"),
      detected("v1-4", "p11", 0, "white leather court sneakers women"),
      detected("v1-5", "p15", 0, "chunky gold hoop earrings"),
    ],
  },
  {
    id: "v2",
    creator: "@jun.wears",
    caption: "date night but make it cozy #grwm",
    sound: "Espresso (sped up) - jun.wears",
    likes: "112K", comments: "2,041", saves: "31.5K", shares: "4,920",
    bg: ["#2B2F3A", "#4A3A3F"],
    outfit: { outerwear: piece("p22"), top: piece("p03"), bottom: piece("p08", 2), shoes: piece("p12"), accessory: piece("p16") },
    detected: [
      detected("v2-1", "p22", 0, "black faux leather moto jacket"),
      detected("v2-2", "p03", 0, "black fitted ribbed baby tee"),
      detected("v2-3", "p08", 2, "black pleated mini skirt"),
      detected("v2-4", "p12", 0, "black knee high boots block heel"),
      detected("v2-5", "p16", 0, "black mini shoulder bag"),
    ],
  },
  {
    id: "v3",
    creator: "@thriftqueen",
    caption: "office siren on a budget, links in bio",
    sound: "Midnight City - M83",
    likes: "27.9K", comments: "388", saves: "6,233", shares: "702",
    bg: ["#33302B", "#5A4E3E"],
    outfit: { outerwear: piece("p20", 1), top: piece("p01"), bottom: piece("p07"), shoes: piece("p13"), accessory: piece("p18", 1) },
    detected: [
      detected("v3-1", "p20", 1, "camel oversized blazer women"),
      detected("v3-2", "p01", 0, "white linen button up shirt"),
      detected("v3-3", "p07", 0, "black pleated wide leg trousers"),
      detected("v3-4", "p13", 0, "brown suede penny loafers chunky"),
      detected("v3-5", "p18", 1, "dainty gold chain necklace"),
    ],
  },
  {
    id: "v4",
    creator: "@ari.fits",
    caption: "pink era is not over #coquette",
    sound: "Pink Pony Club - Chappell Roan",
    likes: "203K", comments: "5,377", saves: "58.1K", shares: "12.4K",
    bg: ["#3B2D36", "#6B3F57"],
    outfit: { top: piece("p04"), bottom: piece("p10"), shoes: piece("p14", 1), accessory: piece("p16", 1) },
    detected: [
      detected("v4-1", "p04", 0, "baby pink cropped pointelle cardigan"),
      detected("v4-2", "p10", 0, "denim maxi skirt front slit"),
      detected("v4-3", "p14", 1, "nude square toe ballet flats mary jane"),
      detected("v4-4", "p16", 1, "pink mini shoulder bag"),
    ],
  },
];

export const SAMPLE_LOOK = FEED[0];

// Pieces already in the Studio for the sample profile (enough to shuffle)
export const SAMPLE_CLOSET = [
  piece("p19"), piece("p20", 1), piece("p22"),
  piece("p24"), piece("p01"), piece("p03"), piece("p04"),
  piece("p06"), piece("p07"), piece("p08"),
  piece("p11"), piece("p12"), piece("p13"),
  piece("p15"), piece("p16", 1),
];

export const SAMPLE_SAVED = [
  {
    id: "o-weekend", name: "Weekend layers", layerOrder: DEFAULT_ORDER,
    items: { outerwear: piece("p19"), top: piece("p03", 1), bottom: piece("p06"), shoes: piece("p11"), accessory: piece("p15") },
  },
  {
    id: "o-halloween", name: "Halloween", layerOrder: DEFAULT_ORDER,
    items: { outerwear: piece("p22"), top: piece("p03"), bottom: piece("p08", 2), shoes: piece("p12"), accessory: piece("p16") },
  },
  {
    id: "o-campus", name: "Campus essentials", layerOrder: DEFAULT_ORDER,
    items: { top: piece("p23"), bottom: piece("p09"), shoes: piece("p13"), accessory: piece("p17") },
  },
];

export const SAMPLE_COMMUNITY = [
  { id: "c1", creator: "@maya.styles", name: "Coffee run", likes: 128, layerOrder: DEFAULT_ORDER,
    items: { outerwear: piece("p20", 1), top: piece("p01"), bottom: piece("p07"), shoes: piece("p13"), accessory: piece("p15") } },
  { id: "c2", creator: "@jun.wears", name: "Pink era", likes: 94, layerOrder: DEFAULT_ORDER,
    items: { top: piece("p04"), bottom: piece("p08"), shoes: piece("p14", 1), accessory: piece("p16", 1) } },
  { id: "c3", creator: "@thriftqueen", name: "Rainy day", likes: 61, layerOrder: DEFAULT_ORDER,
    items: { outerwear: piece("p21"), top: piece("p05"), bottom: piece("p25", 1), shoes: piece("p12", 1) } },
  { id: "c4", creator: "@ari.fits", name: "Date night", likes: 203, layerOrder: DEFAULT_ORDER,
    items: { outerwear: piece("p22"), top: piece("p03"), bottom: piece("p07"), shoes: piece("p14"), accessory: piece("p18", 1) } },
];
