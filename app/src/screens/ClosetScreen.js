// Closet: every piece you wanted from videos, sorted automatically into collections
// (Summer tops, Cozy knits, Winter coats, Jeans, Boots...). Tap "Try on" to send it to the Studio,
// where it lands in the right layer (inner / mid / outer) on its own.
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import GarmentThumb from "../components/GarmentThumb";
import Icon from "../components/Icon";
import { Button, Header, screen } from "../components/ui";
import { useApp } from "../store";
import { COLLECTION_ORDER, collectionOf, colors, fonts, makePiece, money, slotLabel, slotOf } from "../theme";
import { Sparkle } from "../components/ui";
import products from "../data/products.json";
import { recommendSize } from "../sizing";

// the best product for a scanned item: its exact match, or the closest color in that category
function productFor(item) {
  if (item.matchId) return products.find((p) => p.id === item.matchId);
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const dist = (a, b) => { const x = rgb(a); const y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  return products
    .filter((p) => p.category === item.category)
    .sort((a, b) => Math.min(...a.colors.map((c) => dist(c, item.color))) - Math.min(...b.colors.map((c) => dist(c, item.color))))[0];
}

export default function ClosetScreen({ onBag, onDiscover, onOpenStudio }) {
  const { state, actions } = useApp();
  const [active, setActive] = useState("all");
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);

  // group pieces into their collections, in a fixed order
  const groups = useMemo(() => {
    const map = new Map();
    state.closet.forEach((p) => {
      const c = collectionOf(p);
      map.set(c.key, [...(map.get(c.key) || []), p]);
    });
    return COLLECTION_ORDER.filter((c) => map.has(c.key)).map((c) => ({ ...c, items: map.get(c.key) }));
  }, [state.closet]);

  const items = active === "all" ? state.closet : groups.find((g) => g.key === active)?.items || [];
  const wearing = (p) => Object.values(state.outfit).some((o) => o?.uid === p.uid);

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.uid}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={screen.page}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <View>
            <Header title="Your" emphasis="closet" subtitle="Everything you wanted from videos, sorted for you." bagCount={bagCount} onBag={onBag} />
            <View style={st.stamp}>
              <Text style={st.stampNum}>{state.closet.length}</Text>
              <Text style={st.stampText}>pieces{"\n"}auto-sorted</Text>
            </View>
          </View>

          {state.recent.length > 0 && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={screen.section}>Recently scanned</Text>
                <Sparkle size={14} color={colors.ink} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
                {state.recent.map((r) => {
                  const product = productFor(r);
                  if (!product) return null;
                  const ci = Math.max(0, product.colors.findIndex((c) => c.toLowerCase() === String(r.color).toLowerCase()));
                  const owned = state.closet.some((c) => c.productId === product.id);
                  const add = () => {
                    const size = recommendSize(product, state.purchases, state.profile)?.size || product.sizes[0];
                    actions.addToCloset(makePiece(product, ci, size));
                  };
                  return (
                    <View key={r.id + (r.seenAt || "")} style={st.recent}>
                      <View>
                        <GarmentThumb category={product.category} name={product.name} color={product.colors[ci]} size={96} background={colors.soft} radius={14} />
                        <Pressable onPress={add} disabled={owned} style={[st.quick, owned && st.quickOn]} accessibilityRole="button" accessibilityLabel={owned ? "Already in closet" : `Quick add ${product.name}`}>
                          <Text style={[st.quickText, owned && { color: "#FFFFFF" }]}>{owned ? "✓" : "+"}</Text>
                        </Pressable>
                      </View>
                      <Text style={st.recentName} numberOfLines={2}>{product.name}</Text>
                      <Text style={st.recentMeta}>{product.retailer} · {money(product.price)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Tab label={`All · ${state.closet.length}`} on={active === "all"} onPress={() => setActive("all")} />
            {groups.map((g) => (
              <Tab key={g.key} label={`${g.label} · ${g.items.length}`} on={active === g.key} onPress={() => setActive(g.key)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={[screen.card, { alignItems: "center", gap: 12, paddingVertical: 28 }]}>
          <Icon name="saved" size={30} />
          <Text style={[screen.muted, { textAlign: "center" }]}>Your closet is empty. Tap the Tillie "T" on a video and save the pieces you like.</Text>
          <Button title="Go to Discover" onPress={onDiscover} />
        </View>
      }
      renderItem={({ item: p }) => {
        const on = wearing(p);
        return (
          <View style={st.card}>
            <View style={st.imageBox}>
              <GarmentThumb category={p.category} name={p.name} color={p.color} size={150} background="transparent" radius={0} />
              <Pressable onPress={() => actions.removeFromCloset(p.uid)} style={st.remove} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Remove ${p.name} from closet`}>
                <Icon name="close" size={13} />
              </Pressable>
              <View style={st.layerTag}>
                <Text style={st.layerTagText}>{slotLabel(slotOf(p))}</Text>
              </View>
            </View>
            <Text style={st.retailer}>{p.retailer}</Text>
            <Text style={st.name} numberOfLines={2}>{p.name}</Text>
            <Text style={st.meta}>{p.colorName} · {money(p.price)}</Text>
            <Pressable
              onPress={() => { actions.addToStudio(p); onOpenStudio(); }}
              style={[st.tryBtn, on && st.tryOn]}
              accessibilityRole="button"
            >
              <Text style={[st.tryText, on && { color: "#FFFFFF" }]}>{on ? "Wearing ✓" : "Try on"}</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

function Tab({ label, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[st.tab, on && st.tabOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[st.tabText, on && { color: "#FFFFFF" }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  recent: { width: 104, gap: 3 },
  quick: { position: "absolute", right: -4, bottom: -4, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  quickOn: { backgroundColor: colors.ink },
  quickText: { color: "#FFFFFF", fontFamily: fonts.pixel, fontSize: 24, lineHeight: 26 },
  recentName: { fontSize: 12, fontFamily: fonts.semibold, color: colors.ink2, marginTop: 4 },
  recentMeta: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  stamp: { position: "absolute", right: 0, top: 64, width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderColor: "#A9B1BF", alignItems: "center", justifyContent: "center", transform: [{ rotate: "6deg" }] },
  stampNum: { fontSize: 26, fontFamily: fonts.pixel, color: colors.pink },
  stampText: { fontSize: 8, color: colors.muted, textAlign: "center", fontFamily: fonts.medium },
  tab: { borderWidth: 1, borderColor: colors.chipLine, borderRadius: 22, paddingHorizontal: 14, minHeight: 38, justifyContent: "center" },
  tabOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  tabText: { fontSize: 17, fontFamily: fonts.pixel, color: colors.ink },
  card: { flex: 1, maxWidth: "50%", gap: 3, marginBottom: 10 },
  imageBox: { aspectRatio: 0.82, borderRadius: 21, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 6 },
  remove: { position: "absolute", top: 9, right: 9, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  layerTag: { position: "absolute", left: 9, bottom: 9, backgroundColor: "rgba(17,19,24,0.75)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  layerTagText: { color: "#FFFFFF", fontSize: 9, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.8 },
  retailer: { fontSize: 15, color: colors.pink, fontFamily: fonts.pixel },
  name: { fontSize: 14, color: colors.ink, fontFamily: fonts.semibold },
  meta: { fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  tryBtn: { marginTop: 6, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 12, minHeight: 38, alignItems: "center", justifyContent: "center" },
  tryOn: { backgroundColor: colors.ink },
  tryText: { fontSize: 18, fontFamily: fonts.pixel, color: colors.ink },
});
