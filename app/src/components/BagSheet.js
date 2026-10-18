// Bag → cross-border checkout → order placed, all inside Tillie.
// One Visa payment covers every store, in any country: Tillie converts the currency,
// prepays duties and taxes, and places each retailer's order for you.
// Prototype: rates, fees and orders are simulated. No real payment is made.
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useApp } from "../store";
import { COUNTRIES, countryOf, inCurrency, originOf } from "../data/global";
import { colors, fonts, money } from "../theme";
import { Button, Checkbox, Pill, Sheet, screen } from "./ui";
import GarmentThumb from "./GarmentThumb";
import Icon from "./Icon";

export default function BagSheet({ visible, onClose }) {
  const { state, actions } = useApp();
  const [step, setStep] = useState("bag");
  const [dest, setDest] = useState(state.profile.country || "US");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (visible) {
      setStep("bag");
      setDest(state.profile.country || "US");
    }
  }, [visible]);

  const selected = state.bag.filter((b) => b.selected);
  const subtotal = selected.reduce((sum, b) => sum + b.price * b.qty, 0);
  const title = step === "bag" ? "Shopping bag" : step === "checkout" ? "Checkout" : step === "paying" ? "Paying…" : "Order placed";

  function pay(quote) {
    setStep("paying");
    const newOrder = {
      id: `TL-${Math.floor(100000 + Math.random() * 900000)}`,
      at: Date.now(),
      dest,
      total: quote.total,
      items: selected,
      groups: quote.groups.map((g) => ({ retailer: g.retailer, origin: g.origin.country, arrives: g.arrives, count: g.items.length })),
    };
    setTimeout(() => {
      actions.placeOrder(newOrder);
      setOrder(newOrder);
      setStep("done");
    }, 1800);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title} height="90%">
      {step === "bag" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={state.bag}
            keyExtractor={(b) => b.uid}
            contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
            ListEmptyComponent={<Text style={screen.muted}>Your bag is empty. Add pieces from the Studio or a saved outfit.</Text>}
            renderItem={({ item: b }) => {
              const o = originOf(b.retailer);
              return (
                <View style={st.row}>
                  <Checkbox checked={b.selected} onPress={() => actions.toggleBagItem(b.uid)} label={`Include ${b.name} in checkout`} />
                  <GarmentThumb category={b.category} name={b.name} color={b.color} size={56} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={st.retailer}>{b.retailer} · ships from {o.country}</Text>
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
              );
            }}
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
        <Checkout items={selected} subtotal={subtotal} profile={state.profile} dest={dest} setDest={setDest} onBack={() => setStep("bag")} onPay={pay} />
      )}

      {step === "paying" && (
        <View style={st.paying}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={st.payTitle}>Placing your orders</Text>
          {["Converting currency for each store", "Prepaying duties and taxes", "Sending your size + address to each retailer"].map((t) => (
            <Text key={t} style={screen.muted}>· {t}</Text>
          ))}
        </View>
      )}

      {step === "done" && order && <Done order={order} onClose={onClose} />}
    </Sheet>
  );
}

function groupByRetailer(items) {
  const map = new Map();
  items.forEach((it) => map.set(it.retailer, [...(map.get(it.retailer) || []), it]));
  return [...map.entries()];
}

function Checkout({ items, subtotal, profile, dest, setDest, onBack, onPay }) {
  const country = countryOf(dest);
  const address = dest === (profile.country || "US") && profile.street
    ? [profile.street, profile.city, profile.zip].filter(Boolean).join(", ")
    : `${country.city}, ${country.name} (sample address)`;

  // per-store breakdown: origin, shipping, duties, arrival
  const groups = groupByRetailer(items).map(([retailer, list]) => {
    const origin = originOf(retailer);
    const cross = origin.code !== dest;
    const sub = list.reduce((s, b) => s + b.price * b.qty, 0);
    const shipping = cross ? 9.99 : 4.99;
    const duties = cross ? sub * country.duty : 0;
    const days = origin.days + (cross ? 3 : 0);
    const arrives = new Date(Date.now() + days * 86400000).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return { retailer, items: list, origin, cross, sub, shipping, duties, arrives };
  });
  const shipping = groups.reduce((s, g) => s + g.shipping, 0);
  const duties = groups.reduce((s, g) => s + g.duties, 0);
  const total = subtotal + shipping + duties;
  const crossCount = groups.filter((g) => g.cross).length;

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
        <Text style={st.back}>‹ Back to bag</Text>
      </Pressable>

      <Text style={screen.section}>Ship to</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {COUNTRIES.map((c) => <Pill key={c.code} label={c.name} selected={dest === c.code} onPress={() => setDest(c.code)} />)}
      </ScrollView>
      <Text style={st.address}>{address}</Text>

      {crossCount > 0 && (
        <View style={st.globalBox}>
          <Icon name="sparkle" size={18} />
          <Text style={st.globalText}>
            {crossCount} of your stores ship internationally. Tillie handles currency, duties and customs in one payment, with no surprise fees at your door.
          </Text>
        </View>
      )}

      {groups.map((g) => (
        <View key={g.retailer} style={st.group}>
          <View style={st.groupHead}>
            <Text style={st.groupName}>{g.retailer}</Text>
            <Text style={[st.badge, g.cross && st.badgeCross]}>{g.cross ? "International" : "Domestic"}</Text>
          </View>
          <Text style={st.delivery}>{g.origin.country} → {country.name} · arrives by {g.arrives}</Text>
          {g.items.map((b) => (
            <View key={b.uid} style={st.lineRow}>
              <GarmentThumb category={b.category} name={b.name} color={b.color} size={36} />
              <Text style={st.lineName} numberOfLines={1}>{b.name} · {b.size}{b.qty > 1 ? ` × ${b.qty}` : ""}</Text>
              <Text style={st.price}>{money(b.price * b.qty)}</Text>
            </View>
          ))}
          {g.origin.currency !== "USD" && (
            <Text style={st.fx}>{g.retailer} is paid {inCurrency(g.sub, g.origin.currency, g.origin.perUSD)} · you pay {money(g.sub)}</Text>
          )}
        </View>
      ))}

      <View style={st.summary}>
        <SummaryRow label="Items" value={money(subtotal)} />
        <SummaryRow label={`Shipping · ${groups.length} store${groups.length > 1 ? "s" : ""}`} value={money(shipping)} />
        <SummaryRow label="Duties & taxes · prepaid" value={money(duties)} />
        <SummaryRow label="Currency conversion" value="$0.00" />
        <View style={st.divider} />
        <SummaryRow label="Total" value={money(total)} bold />
        {dest !== "US" && <Text style={st.local}>≈ {inCurrency(total, country.currency, country.perUSD)} in {country.name}</Text>}
      </View>

      <View style={st.cardRow}>
        <View style={st.visa}><Text style={st.visaText}>VISA</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={screen.label}>Visa ending 4242</Text>
          <Text style={screen.sample}>One payment. Tillie pays each store in its own currency.</Text>
        </View>
      </View>

      <Button title={`Pay ${money(total)}`} onPress={() => onPay({ total, groups })} />
      <Text style={screen.sample}>Prototype: sample exchange rates, duties and shipping. No real payment or order.</Text>
    </ScrollView>
  );
}

function Done({ order, onClose }) {
  const country = countryOf(order.dest);
  const learned = [...new Map(order.items.filter((b) => ["top", "outerwear", "bottom"].includes(b.category)).map((b) => [b.retailer, b])).values()];
  return (
    <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
      <View style={st.doneBadge}>
        <Icon name="sparkle" size={34} />
      </View>
      <Text style={st.doneTitle}>Your Tillie order is placed</Text>
      <Text style={[screen.muted, { textAlign: "center" }]}>Order {order.id} · {money(order.total)} paid with Visa ending 4242 · shipping to {country.name}</Text>

      {order.groups.map((g, i) => (
        <View key={g.retailer} style={st.trackRow}>
          <View style={st.trackDot} />
          <View style={{ flex: 1 }}>
            <Text style={st.trackName}>{g.retailer} · {g.count} item{g.count > 1 ? "s" : ""}</Text>
            <Text style={st.delivery}>Confirmed · ships from {g.origin} · arrives by {g.arrives}</Text>
            <Text style={st.tracking}>Tracking {order.id}-{i + 1}</Text>
          </View>
        </View>
      ))}

      {learned.length > 0 && (
        <View style={st.globalBox}>
          <Icon name="studio" size={18} />
          <Text style={st.globalText}>
            Tillie learned your fit: {learned.map((b) => `${b.size} at ${b.retailer}`).join(", ")}. Next time, sizes at other brands are translated for you.
          </Text>
        </View>
      )}

      <Text style={[screen.sample, { textAlign: "center" }]}>Demo order · nothing was charged · +10 creator points</Text>
      <Button title="Done" onPress={onClose} />
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
  retailer: { color: colors.muted, fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.8 },
  name: { color: colors.ink, fontSize: 15, fontFamily: fonts.semibold },
  meta: { color: colors.muted, fontSize: 13, fontFamily: fonts.regular },
  price: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  qty: { minWidth: 18, textAlign: "center", fontFamily: fonts.bold, color: colors.ink, fontVariant: ["tabular-nums"] },
  remove: { color: colors.danger, fontSize: 13, fontFamily: fonts.bold },
  footer: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  totalLabel: { color: colors.ink, fontSize: 15, flex: 1, fontFamily: fonts.regular },
  totalValue: { color: colors.ink, fontSize: 18, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  back: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold },
  address: { fontSize: 13, color: colors.muted, fontFamily: fonts.regular },
  globalBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.yellow, borderRadius: 16, padding: 12 },
  globalText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.ink, fontFamily: fonts.medium },
  group: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.line },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  badge: { fontSize: 10, fontFamily: fonts.bold, color: colors.ink, backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden", textTransform: "uppercase", letterSpacing: 0.8 },
  badgeCross: { backgroundColor: colors.ink, color: colors.yellow },
  delivery: { fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  lineName: { flex: 1, color: colors.ink, fontSize: 14, fontFamily: fonts.regular },
  fx: { fontSize: 12, color: colors.ink, fontFamily: fonts.medium, marginTop: 4 },
  summary: { backgroundColor: colors.soft, borderRadius: 18, padding: 14, gap: 8 },
  divider: { height: 1, backgroundColor: colors.chipLine, marginVertical: 2 },
  local: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium, textAlign: "right" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  visa: { width: 52, height: 34, borderRadius: 6, backgroundColor: "#1A1F71", alignItems: "center", justifyContent: "center" },
  visaText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 13, fontStyle: "italic", letterSpacing: 1 },
  paying: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  payTitle: { fontSize: 20, fontFamily: fonts.bold, color: colors.ink, marginBottom: 6 },
  doneBadge: { alignSelf: "center", width: 76, height: 76, borderRadius: 38, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center", marginTop: 8 },
  doneTitle: { fontSize: 24, fontFamily: fonts.medium, color: colors.ink, textAlign: "center", letterSpacing: -0.6 },
  trackRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  trackDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, marginTop: 4 },
  trackName: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  tracking: { fontSize: 11, color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
});
