// Closet: every piece you wanted from videos, sorted automatically into collections
// (Summer tops, Cozy knits, Winter coats, Jeans, Boots...). Tap "Try on" to send it to the Studio,
// where it lands in the right layer (inner / mid / outer) on its own.
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import GarmentThumb from "../components/GarmentThumb";
import Icon from "../components/Icon";
import { Button, Header, screen } from "../components/ui";
import { useApp } from "../store";
import { COLLECTION_ORDER, collectionOf, colors, fonts, money, slotLabel, slotOf } from "../theme";

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
  stamp: { position: "absolute", right: 0, top: 64, width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderColor: "#A9B1BF", alignItems: "center", justifyContent: "center", transform: [{ rotate: "6deg" }] },
  stampNum: { fontSize: 20, fontFamily: fonts.bold, color: colors.ink },
  stampText: { fontSize: 8, color: colors.muted, textAlign: "center", fontFamily: fonts.medium },
  tab: { borderWidth: 1, borderColor: colors.chipLine, borderRadius: 22, paddingHorizontal: 14, minHeight: 38, justifyContent: "center" },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontSize: 12, fontFamily: fonts.medium, color: colors.ink },
  card: { flex: 1, maxWidth: "50%", gap: 3, marginBottom: 10 },
  imageBox: { aspectRatio: 0.82, borderRadius: 21, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 6 },
  remove: { position: "absolute", top: 9, right: 9, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  layerTag: { position: "absolute", left: 9, bottom: 9, backgroundColor: "rgba(17,19,24,0.75)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  layerTagText: { color: "#FFFFFF", fontSize: 9, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.8 },
  retailer: { fontSize: 10, color: colors.muted, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: 14, color: colors.ink, fontFamily: fonts.semibold },
  meta: { fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  tryBtn: { marginTop: 6, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 12, minHeight: 38, alignItems: "center", justifyContent: "center" },
  tryOn: { backgroundColor: colors.ink },
  tryText: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink },
});
