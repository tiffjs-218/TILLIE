// Shopping bag → checkout preview (grouped by retailer) → confirmation.
// Simulated: no payment details are collected and no real orders are placed.
import { useEffect, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useApp } from "../store";
import { colors, money, shopUrl, fonts } from "../theme";
import { Button, Checkbox, Sheet, screen } from "./ui";
import GarmentThumb from "./GarmentThumb";

export default function BagSheet({ visible, onClose }) {
  const { state, actions } = useApp();
  const [step, setStep] = useState("bag");
  const [placed, setPlaced] = useState([]);

  useEffect(() => {
    if (visible) setStep("bag");
  }, [visible]);

  const selected = state.bag.filter((b) => b.selected);
  const subtotal = selected.reduce((sum, b) => sum + b.price * b.qty, 0);
  const title = step === "bag" ? "Shopping bag" : step === "checkout" ? "Checkout preview" : "Order placed";

  return (
    <Sheet visible={visible} onClose={onClose} title={title} height="88%">
      {step === "bag" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={state.bag}
            keyExtractor={(b) => b.uid}
            contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
            ListEmptyComponent={<Text style={screen.muted}>Your bag is empty. Add pieces from the Studio or a saved outfit.</Text>}
            renderItem={({ item: b }) => (
              <View style={st.row}>
                <Checkbox checked={b.selected} onPress={() => actions.toggleBagItem(b.uid)} label={`Include ${b.name} in checkout`} />
                <GarmentThumb category={b.category} name={b.name} color={b.color} size={56} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={st.retailer}>{b.retailer}</Text>
                  <Text style={st.name} numberOfLines={1}>{b.name}</Text>
                  <Text style={st.meta}>{b.colorName} · Size {b.size}</Text>
                  <View style={st.qtyRow}>
                    <Pressable onPress={() => actions.setQty(b.uid, b.qty - 1)} style={st.qtyBtn} accessibilityLabel="Decrease quantity" hitSlop={6}><Text style={st.qtyText}>−</Text></Pressable>
                    <Text style={st.qty} accessibilityLabel={`Quantity ${b.qty}`}>{b.qty}</Text>
                    <Pressable onPress={() => actions.setQty(b.uid, b.qty + 1)} style={st.qtyBtn} accessibilityLabel="Increase quantity" hitSlop={6}><Text style={st.qtyText}>+</Text></Pressable>
                    <Pressable onPress={() => actions.removeFromBag(b.uid)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${b.name}`} style={{ marginLeft: "auto" }}>
                      <Text style={st.remove}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={st.price}>{money(b.price * b.qty)}</Text>
              </View>
            )}
          />
          {state.bag.length > 0 && (
            <View style={st.footer}>
              <View style={st.totalRow}>
                <Text style={st.totalLabel}>Selected ({selected.length})</Text>
                <Text style={st.totalValue}>{money(subtotal)}</Text>
              </View>
              <Button title="Review checkout" disabled={!selected.length} onPress={() => setStep("checkout")} />
            </View>
          )}
        </View>
      )}

      {step === "checkout" && (
        <Checkout
          items={selected}
          subtotal={subtotal}
          profile={state.profile}
          onBack={() => setStep("bag")}
          onPlace={() => {
            setPlaced(groupByRetailer(selected));
            actions.completeCheckout();
            setStep("done");
          }}
        />
      )}

      {step === "done" && (
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
          <View style={st.doneBadge}>
            <Text style={st.doneCheck}>✓</Text>
          </View>
          <Text style={st.doneTitle}>Sample order placed</Text>
          <Text style={[screen.muted, { textAlign: "center" }]}>
            Nothing was charged. In the full app, you'd finish each order on the retailer's site with your saved address.
          </Text>
          {placed.map(([retailer, items]) => (
            <Button key={retailer} title={`Continue on ${retailer}`} variant="secondary" onPress={() => Linking.openURL(shopUrl(items[0]))} />
          ))}
          <Text style={[screen.sample, { textAlign: "center" }]}>+10 creator points for shopping a look</Text>
          <Button title="Done" onPress={onClose} />
        </ScrollView>
      )}
    </Sheet>
  );
}

function groupByRetailer(items) {
  const map = new Map();
  items.forEach((it) => map.set(it.retailer, [...(map.get(it.retailer) || []), it]));
  return [...map.entries()];
}

function Checkout({ items, subtotal, profile, onBack, onPlace }) {
  const groups = groupByRetailer(items);
  const address = [profile.street, profile.city, profile.zip].filter(Boolean).join(", ");
  const arrival = new Date(Date.now() + 5 * 86400000).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const shipping = groups.length * 4.99;

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
        <Text style={st.back}>‹ Back to bag</Text>
      </Pressable>

      {groups.map(([retailer, list]) => (
        <View key={retailer} style={st.group}>
          <View style={st.groupHead}>
            <Text style={st.groupName}>{retailer}</Text>
            <Text style={st.meta}>{list.length} item{list.length > 1 ? "s" : ""}</Text>
          </View>
          <Text style={st.delivery}>Delivering to {address || "your address (add it in Profile)"}</Text>
          <Text style={st.delivery}>Arriving by {arrival} (sample)</Text>
          {list.map((b) => (
            <View key={b.uid} style={st.lineRow}>
              <GarmentThumb category={b.category} name={b.name} color={b.color} size={36} />
              <Text style={st.lineName} numberOfLines={1}>{b.name} · {b.size}{b.qty > 1 ? ` × ${b.qty}` : ""}</Text>
              <Text style={st.price}>{money(b.price * b.qty)}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={st.summary}>
        <SummaryRow label="Subtotal" value={money(subtotal)} />
        <SummaryRow label={`Shipping (${groups.length} retailer${groups.length > 1 ? "s" : ""}, sample)`} value={money(shipping)} />
        <SummaryRow label="Total" value={money(subtotal + shipping)} bold />
      </View>

      <Text style={screen.muted}>Purchases are completed through each retailer. Tillie doesn't collect payment details or place real orders in this prototype.</Text>
      <Button title="Place sample order" onPress={onPlace} />
    </ScrollView>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <View style={st.totalRow}>
      <Text style={[st.totalLabel, bold && { fontFamily: fonts.bold }]}>{label}</Text>
      <Text style={[st.totalValue, !bold && { fontSize: 15, fontFamily: fonts.semibold }]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.line },
  retailer: { color: colors.muted, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.8 },
  name: { color: colors.ink, fontSize: 15, fontFamily: fonts.semibold },
  meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  price: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  qty: { minWidth: 18, textAlign: "center", fontFamily: fonts.bold, color: colors.ink, fontVariant: ["tabular-nums"] },
  remove: { color: colors.danger, fontSize: 13, fontFamily: fonts.bold },
  footer: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  totalLabel: { color: colors.ink, fontFamily: fonts.regular, fontSize: 15, flex: 1 },
  totalValue: { color: colors.ink, fontSize: 18, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  back: { color: colors.accent, fontSize: 15, fontFamily: fonts.bold },
  group: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.line },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  delivery: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  lineName: { flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 14 },
  summary: { backgroundColor: colors.lavender, borderRadius: 18, padding: 14, gap: 8 },
  doneBadge: { alignSelf: "center", width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", marginTop: 12 },
  doneCheck: { fontSize: 34, color: colors.accent, fontFamily: fonts.bold },
  doneTitle: { fontSize: 22, fontFamily: fonts.bold, color: colors.ink, textAlign: "center" },
});
