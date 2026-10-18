// All of Tillie's data in one place, shared with every screen through React context.
// Bag, saved outfits, studio, community and profile are saved on the phone (AsyncStorage).
import { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_ORDER, SAMPLE_CLOSET, SAMPLE_COMMUNITY, SAMPLE_SAVED } from "./data/seed";

const KEY = "tillie:v1";
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const EMPTY = {
  onboarded: false,
  profile: { name: "", size: "M", styles: [], budget: "50", unit: "in", height: "65", waist: "28", arm: "23", torso: "16", street: "", city: "", zip: "" },
  closet: [], // pieces available in the Studio
  outfit: {}, // { outerwear, top, bottom, shoes, accessory } on the avatar now
  layerOrder: DEFAULT_ORDER, // outside → inside
  locked: {}, // { top: true } = keep this piece when shuffling
  bag: [], // { ...piece, qty, selected }
  saved: [], // saved outfits
  community: SAMPLE_COMMUNITY,
  liked: {}, // { postId: 1 | -1 }
  favorites: [], // product ids saved with "Save item"
  points: 0,
};

const SAMPLE_PROFILE = {
  ...EMPTY,
  onboarded: true,
  profile: { ...EMPTY.profile, name: "Sample shopper", styles: ["Casual", "Streetwear"], street: "4000 15th Ave NE", city: "Seattle, WA", zip: "98105" },
  closet: SAMPLE_CLOSET,
  outfit: SAMPLE_SAVED[0].items,
  saved: SAMPLE_SAVED,
  points: 40,
};

export function AppProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);

  // Load saved data once
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save (debounced) whenever anything changes
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}), 300);
  }, [state, loaded]);

  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const notify = (text) => setToast({ text, at: Date.now() });

  const actions = {
    notify,
    startSample: () => setState(SAMPLE_PROFILE),
    startFresh: () => set({ onboarded: true }),
    resetAll: () => setState(EMPTY),
    setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

    // Studio
    addToStudio: (piece) => {
      set((s) => ({
        closet: s.closet.some((p) => p.uid === piece.uid) ? s.closet : [...s.closet, piece],
        outfit: { ...s.outfit, [piece.category]: piece },
      }));
      notify(`Added to studio: ${piece.name}`);
    },
    removeFromStudio: (uid) =>
      set((s) => {
        const outfit = { ...s.outfit };
        Object.keys(outfit).forEach((k) => outfit[k]?.uid === uid && delete outfit[k]);
        return { closet: s.closet.filter((p) => p.uid !== uid), outfit };
      }),
    wear: (category, piece) => set((s) => ({ outfit: { ...s.outfit, [category]: piece || undefined } })),
    setLayerOrder: (layerOrder) => set({ layerOrder }),
    toggleLock: (category) => set((s) => ({ locked: { ...s.locked, [category]: !s.locked[category] } })),
    shuffle: () =>
      set((s) => {
        const outfit = { ...s.outfit };
        Object.keys(EMPTY_CATS).forEach((cat) => {
          if (s.locked[cat]) return;
          const options = s.closet.filter((p) => p.category === cat);
          if (options.length) outfit[cat] = options[Math.floor(Math.random() * options.length)];
        });
        return { outfit };
      }),
    loadOutfit: (o) =>
      set((s) => ({ outfit: { ...o.items }, layerOrder: o.layerOrder || DEFAULT_ORDER, closet: mergeCloset(s.closet, o.items) })),

    // Saved outfits
    saveOutfit: (name) => {
      set((s) => ({ saved: [{ id: `o${Date.now()}`, name, items: { ...s.outfit }, layerOrder: s.layerOrder }, ...s.saved] }));
      notify(`Saved "${name}"`);
    },
    renameOutfit: (id, name) => set((s) => ({ saved: s.saved.map((o) => (o.id === id ? { ...o, name } : o)) })),
    deleteOutfit: (id) => set((s) => ({ saved: s.saved.filter((o) => o.id !== id) })),

    // Bag
    addToBag: (pieces) => {
      set((s) => {
        let bag = s.bag;
        pieces.forEach((p) => {
          bag = bag.some((b) => b.uid === p.uid)
            ? bag.map((b) => (b.uid === p.uid ? { ...b, qty: b.qty + 1 } : b))
            : [...bag, { ...p, qty: 1, selected: true }];
        });
        return { bag };
      });
      notify(pieces.length === 1 ? "Added to bag" : `Added ${pieces.length} pieces to bag`);
    },
    setQty: (uid, qty) => set((s) => ({ bag: s.bag.map((b) => (b.uid === uid ? { ...b, qty: Math.max(1, qty) } : b)) })),
    toggleBagItem: (uid) => set((s) => ({ bag: s.bag.map((b) => (b.uid === uid ? { ...b, selected: !b.selected } : b)) })),
    removeFromBag: (uid) => set((s) => ({ bag: s.bag.filter((b) => b.uid !== uid) })),
    completeCheckout: () => set((s) => ({ bag: s.bag.filter((b) => !b.selected), points: s.points + 10 })),

    // Favorites
    toggleFavorite: (productId) => {
      const on = !state.favorites.includes(productId);
      set((s) => ({ favorites: on ? [...s.favorites, productId] : s.favorites.filter((x) => x !== productId) }));
      notify(on ? "Item saved" : "Removed from saved items");
    },

    // Community
    publish: (o) => {
      set((s) => ({
        community: [{ id: `c${Date.now()}`, creator: "@you", name: o.name, likes: 0, items: o.items, layerOrder: o.layerOrder, mine: true, sourceId: o.sourceId }, ...s.community],
        points: s.points + 25,
      }));
      notify("Posted to Community · +25 points");
    },
    react: (postId, value) => set((s) => ({ liked: { ...s.liked, [postId]: s.liked[postId] === value ? 0 : value } })),
  };

  if (!loaded) return null;
  return <AppContext.Provider value={{ state, actions, toast }}>{children}</AppContext.Provider>;
}

const EMPTY_CATS = { outerwear: 1, top: 1, bottom: 1, shoes: 1, accessory: 1 };

function mergeCloset(closet, items) {
  const add = Object.values(items).filter((p) => p && !closet.some((c) => c.uid === p.uid));
  return [...closet, ...add];
}

// Helpers used by several screens
export const outfitPieces = (items) => Object.values(items || {}).filter(Boolean);
export const outfitTotal = (items) => outfitPieces(items).reduce((sum, p) => sum + Number(p.price || 0), 0);
