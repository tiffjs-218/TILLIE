// All of Tillie's data in one place, shared with every screen through React context.
// Closet, studio, bag, saved outfits, orders, community and profile are saved on the phone.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SAMPLE_CLOSET, SAMPLE_COMMUNITY, SAMPLE_SAVED, SAMPLE_PURCHASES } from "./data/seed";
import { DEFAULT_ORDER, slotOf } from "./theme";

const KEY = "tillie:v2";
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const EMPTY = {
  onboarded: false,
  profile: {
    name: "", size: "M", styles: [], budget: "50", unit: "in",
    height: "65", bust: "34", waist: "28", arm: "23", torso: "16",
    street: "", city: "", zip: "", country: "US",
  },
  closet: [], // every piece you wanted from a video (auto-sorted into collections)
  outfit: {}, // { outer, mid, inner, bottom, shoes, accessory } on the avatar now
  layerOrder: DEFAULT_ORDER, // outside → inside
  locked: {}, // { inner: true } = keep this layer when shuffling
  bag: [], // { ...piece, qty, selected }
  saved: [], // saved complete outfits
  orders: [], // orders placed through Tillie
  purchases: [], // what you bought (brand + size) — Tillie learns your fit from these
  community: SAMPLE_COMMUNITY,
  liked: {}, // { postId: 1 | -1 }
  friends: [],
  points: 0,
};

const SAMPLE_PROFILE = {
  ...EMPTY,
  onboarded: true,
  profile: { ...EMPTY.profile, name: "Emelie", size: "S", styles: ["Minimal", "Casual"], street: "4000 15th Ave NE", city: "Seattle, WA", zip: "98105" },
  closet: SAMPLE_CLOSET,
  outfit: SAMPLE_SAVED[0].items,
  saved: SAMPLE_SAVED,
  purchases: SAMPLE_PURCHASES,
  friends: ["@maya.styles"],
  points: 40,
};

export function AppProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}), 300);
  }, [state, loaded]);

  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const notify = (text) => setToast({ text, at: Date.now() });
  const inCloset = (s, piece) => s.closet.some((p) => p.uid === piece.uid);

  const actions = {
    notify,
    startSample: () => setState(SAMPLE_PROFILE),
    startFresh: () => set({ onboarded: true }),
    resetAll: () => setState(EMPTY),
    setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

    // Closet: everything you wanted from videos
    addToCloset: (piece) => {
      set((s) => ({ closet: inCloset(s, piece) ? s.closet : [...s.closet, piece] }));
      notify(`Saved to your closet`);
    },
    removeFromCloset: (uid) =>
      set((s) => {
        const outfit = { ...s.outfit };
        Object.keys(outfit).forEach((k) => outfit[k]?.uid === uid && delete outfit[k]);
        return { closet: s.closet.filter((p) => p.uid !== uid), outfit };
      }),

    // Studio: a piece goes on the avatar in its layer automatically (inner / mid / outer...)
    addToStudio: (piece) => {
      const slot = slotOf(piece);
      set((s) => ({ closet: inCloset(s, piece) ? s.closet : [...s.closet, piece], outfit: { ...s.outfit, [slot]: piece } }));
      notify(`On the ${slot === "accessory" ? "accessories" : slot === "outer" || slot === "mid" || slot === "inner" ? `${slot} layer` : slot}: ${piece.name}`);
    },
    wear: (slot, piece) => set((s) => ({ outfit: { ...s.outfit, [slot]: piece || undefined } })),
    setLayerOrder: (layerOrder) => set({ layerOrder }),
    toggleLock: (slot) => set((s) => ({ locked: { ...s.locked, [slot]: !s.locked[slot] } })),
    shuffle: () =>
      set((s) => {
        const outfit = { ...s.outfit };
        DEFAULT_ORDER.forEach((slot) => {
          if (s.locked[slot]) return;
          const options = s.closet.filter((p) => slotOf(p) === slot);
          if (!options.length) return;
          // layers are optional: sometimes skip a mid/outer layer
          if ((slot === "outer" || slot === "mid") && Math.random() < 0.35) delete outfit[slot];
          else outfit[slot] = options[Math.floor(Math.random() * options.length)];
        });
        return { outfit };
      }),
    loadOutfit: (o) =>
      set((s) => ({ outfit: { ...o.items }, layerOrder: o.layerOrder || DEFAULT_ORDER, closet: mergeCloset(s.closet, o.items) })),

    // Saved: complete outfits only
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
    setBagSize: (uid, size) =>
      set((s) => ({ bag: s.bag.map((b) => (b.uid === uid ? { ...b, size, uid: `${b.productId}-${b.color}-${size}` } : b)) })),
    toggleBagItem: (uid) => set((s) => ({ bag: s.bag.map((b) => (b.uid === uid ? { ...b, selected: !b.selected } : b)) })),
    removeFromBag: (uid) => set((s) => ({ bag: s.bag.filter((b) => b.uid !== uid) })),

    // Checkout happens inside Tillie. Each purchase teaches Tillie your size at that brand.
    placeOrder: (order) => {
      set((s) => ({
        bag: s.bag.filter((b) => !b.selected),
        orders: [order, ...s.orders],
        purchases: [
          ...s.purchases,
          ...order.items.map((b) => ({ retailer: b.retailer, size: b.size, category: b.category, productId: b.productId, at: order.at })),
        ],
        points: s.points + 10,
      }));
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
    toggleFriend: (handle) => {
      const on = !state.friends.includes(handle);
      set((s) => ({ friends: on ? [...s.friends, handle] : s.friends.filter((f) => f !== handle) }));
      notify(on ? `Following ${handle}` : `Unfollowed ${handle}`);
    },
  };

  if (!loaded) return null;
  return <AppContext.Provider value={{ state, actions, toast }}>{children}</AppContext.Provider>;
}

function mergeCloset(closet, items) {
  const add = Object.values(items).filter((p) => p && !closet.some((c) => c.uid === p.uid));
  return [...closet, ...add];
}

export const outfitPieces = (items) => Object.values(items || {}).filter(Boolean);
export const outfitTotal = (items) => outfitPieces(items).reduce((sum, p) => sum + Number(p.price || 0), 0);
