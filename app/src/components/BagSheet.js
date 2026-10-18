// Bag + Orders (one sheet, two tabs, no extra navigation tab).
// Bag → checkout (cross-border, rewards, payment method) → text-code verification →
// "Your order is on the way!" with confetti → Orders tab tracks every package.
// Prototype: rates, fees, codes and orders are simulated. No real payment is made.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Easing, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useApp } from "../store";
import { COUNTRIES, countryOf, inCurrency, originOf } from "../data/global";
import { bestReward } from "../data/rewards";
import { colors, fonts, money } from "../theme";
import { Button, Checkbox, Pill, RetroWindow, Sheet, Sparkle, screen } from "./ui";
import GarmentThumb from "./GarmentThumb";
import Icon from "./Icon";

const PAYMENTS = [
  { key: "visa", label: "Visa •••• 4242", sub: "Saved card · one payment covers every store" },
  { key: "apple", label: "Apple Pay", sub: "Pay with Face ID" },
  { key: "paypal", label: "PayPal", sub: "You'll confirm in PayPal" },
  { key: "intl", label: "Another card (incl. international)", sub: "International cards may add foreign-transaction fees from your bank (often ~3%) and currency-conversion charges." },
];
const STAGES = ["Ordered", "Shipped", "Customs cleared", "Out for delivery", "Delivered"];

export default function BagSheet({ visible, onClose, initialTab = "bag" }) {
  const { state, actions } = useApp();
  const [tab, setTab] = useState("bag");
  const [step, setStep] = useState("bag");
  const [dest, setDest] = useState(state.profile.country || "US");
  const [order, setOrder] = useState(null);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setStep("bag");
      setDest(state.profile.country || "US");
    }
  }, [visible]);

  const selected = state.bag.filter((b) => b.selected);
  const subtotal = selected.reduce((sum, b) => sum + b.price * b.qty, 0);
  const title = step === "checkout" ? "Checkout" : step === "verify" ? "Verify payment" : step === "paying" ? "Placing order" : step === "done" ? "" : tab === "orders" ? "Your orders" : "Shopping bag";

  function startVerify(quote) {
    setPending({
      id: `TL-${Math.floor(100000 + Math.random() * 900000)}`,
      at: Date.now(),
      dest,
      total: quote.total,
      pointsUsed: quote.pointsUsed,
      payment: quote.payment,
      items: selected,
      groups: quote.groups.map((g) => ({ retailer: g.retailer, origin: g.origin.country, arrives: g.arrives, count: g.items.length, stage: 0 })),
    });
    setStep("verify");
  }

  function confirmCode() {
    setStep("paying");
    setTimeout(() => {
      actions.placeOrder(pending);
      setOrder(pending);
      setStep("done");
    }, 1600);
  }

  const inFlow = step !== "bag";

  return (
    <Sheet visible={visible} onClose={onClose} title={title} height="92%">
      {!inFlow && (
        <View style={st.tabs}>
          {[["bag", `Bag (${state.bag.reduce((n, b) => n + b.qty, 0)})`], ["orders", `Orders (${state.orders.length})`]].map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <Text style={[st.tabText, tab === k && { color: "#FFFFFF" }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!inFlow && tab === "bag" && <BagList selected={selected} subtotal={subtotal} onCheckout={() => setStep("checkout")} />}
      {!inFlow && tab === "orders" && <Orders orders={state.orders} />}

      {step === "checkout" && (
        <Checkout items={selected} subtotal={subtotal} profile={state.profile} points={state.points} dest={dest} setDest={setDest} onBack={() => setStep("bag")} onPay={startVerify} />
      )}
      {step === "verify" && pending && <Verify phone={state.profile.phone} total={pending.total} onBack={() => setStep("checkout")} onConfirm={confirmCode} />}
      {step === "paying" && (
        <View style={st.paying}>
          <ActivityIndicator size="large" color={colors.pink} />
          <Text style={st.payTitle}>Placing your orders…</Text>
          {["Converting currency for each store", "Prepaying duties and taxes", "Sending your size + address to each retailer"].map((t) => (
            <Text key={t} style={screen.muted}>✦ {t}</Text>
          ))}
        </View>
      )}
      {step === "done" && order && <Done order={order} onTrack={() => { setStep("bag"); setTab("orders"); }} onClose={onClose} />}
    </Sheet>
  );
}

// ---------------- Bag ----------------
function BagList({ selected, subtotal, onCheckout }) {
  const { state, actions } = useApp();
  return (
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
              <GarmentThumb category={b.category} name={b.name} color={b.color} size={56} background={colors.soft} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={st.retailer}>{b.retailer} · from {o.country}</Text>
                <Text style={st.name} numberOfLines={1}>{b.name}</Text>
                <Text style={st.meta}>{b.colorName} · Size {b.size}</Text>
                <View style={st.qtyRow}>
                  <Pressable onPress={() => actions.setQty(b.uid, b.qty - 1)} style={st.qtyBtn} accessibilityLabel="Decrease quantity" hitSlop={6}><Text style={st.qtyText}>−</Text></Pressable>
                  <Text style={st.qty}>{b.qty}</Text>
                  <Pressable onPress={() => actions.setQty(b.uid, b.qty + 1)} style={st.qtyBtn} accessibilityLabel="Increase quantity" hitSlop={6}><Text style={st.qtyText}>+</Text></Pressable>
                  <Pressable onPress={() => actions.removeFromBag(b.uid)} hitSlop={8} accessibilityRole="button" style={{ marginLeft: "auto" }}>
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
          <Button title="Review checkout" disabled={!selected.length} onPress={onCheckout} />
        </View>
      )}
    </View>
  );
}

// ---------------- Orders + tracking ----------------
function Orders({ orders }) {
  const [open, setOpen] = useState(orders[0]?.id);
  if (!orders.length) return <Text style={screen.muted}>No orders yet. Everything you buy through Tillie shows up here with live tracking.</Text>;
  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
      {orders.map((o) => {
        const expanded = open === o.id;
        const allDelivered = o.groups.every((g) => stageOf(o, g) >= 4);
        return (
          <View key={o.id} style={st.orderCard}>
            <Pressable onPress={() => setOpen(expanded ? null : o.id)} style={st.orderHead} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={st.orderId}>{o.id}</Text>
                <Text style={st.meta}>{new Date(o.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {o.items.length} item{o.items.length > 1 ? "s" : ""} · {money(o.total)}</Text>
              </View>
              <View style={[st.statusPill, allDelivered && st.statusDone]}>
                <Text style={[st.statusText, allDelivered && { color: "#FFFFFF" }]}>{allDelivered ? "Delivered" : "On the way"}</Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {o.items.slice(0, 5).map((b) => <GarmentThumb key={b.uid} category={b.category} name={b.name} color={b.color} size={40} background={colors.soft} />)}
            </View>
            {expanded &&
              o.groups.map((g, i) => {
                const stage = stageOf(o, g);
                const domestic = g.origin === countryOf(o.dest).name;
                const steps = domestic ? STAGES.filter((s) => s !== "Customs cleared") : STAGES;
                const idx = Math.min(steps.length - 1, domestic && stage >= 2 ? stage - 1 : stage);
                return (
                  <View key={g.retailer} style={st.track}>
                    <Text style={st.trackName}>{g.retailer} · ships from {g.origin}</Text>
                    <Text style={st.tracking}>Tracking {o.id}-{i + 1} · {stage >= 4 ? `Delivered ${g.arrives}` : `Arrives by ${g.arrives}`}</Text>
                    <View style={st.timeline}>
                      {steps.map((s, k) => (
                        <View key={s} style={st.tlStep}>
                          <View style={[st.tlDot, k <= idx && st.tlDotOn]} />
                          {k < steps.length - 1 && <View style={[st.tlLine, k < idx && st.tlLineOn]} />}
                          <Text style={[st.tlLabel, k <= idx && { color: colors.ink }]} numberOfLines={2}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
          </View>
        );
      })}
      <Text style={screen.sample}>Sample tracking for the prototype.</Text>
    </ScrollView>
  );
}

// progress through the stages: stored stage, plus a little movement over time for the demo
function stageOf(order, g) {
  const minutes = (Date.now() - order.at) / 60000;
  const bump = minutes > 3 ? 1 : 0;
  return Math.min(4, (g.stage || 0) + bump);
}

// ---------------- Checkout ----------------
function groupByRetailer(items) {
  const map = new Map();
  items.forEach((it) => map.set(it.retailer, [...(map.get(it.retailer) || []), it]));
  return [...map.entries()];
}

function Checkout({ items, subtotal, profile, points, dest, setDest, onBack, onPay }) {
  const [pay, setPay] = useState("visa");
  const reward = bestReward(points);
  const [useReward, setUseReward] = useState(!!reward);
  const country = countryOf(dest);
  const address = dest === (profile.country || "US") && profile.street
    ? [profile.street, profile.city, profile.zip].filter(Boolean).join(", ")
    : `${country.city}, ${country.name} (sample address)`;

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
  const discount = useReward && reward ? reward.off : 0;
  const intlFee = pay === "intl" ? (subtotal + shipping + duties - discount) * 0.03 : 0;
  const total = Math.max(0, subtotal + shipping + duties - discount + intlFee);
  const crossCount = groups.filter((g) => g.cross).length;

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
        <Text style={st.back}>‹ Back to bag</Text>
      </Pressable>

      <Text style={screen.section}>(01) Ship to</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {COUNTRIES.map((c) => <Pill key={c.code} label={c.name} selected={dest === c.code} onPress={() => setDest(c.code)} />)}
      </ScrollView>
      <Text style={st.address}>{address}</Text>

      {crossCount > 0 && (
        <View style={st.globalBox}>
          <Sparkle size={16} />
          <Text style={st.globalText}>{crossCount} of your stores ship internationally. Tillie handles currency, duties and customs in one payment, with no surprise fees at your door.</Text>
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
              <GarmentThumb category={b.category} name={b.name} color={b.color} size={36} background={colors.soft} />
              <Text style={st.lineName} numberOfLines={1}>{b.name} · {b.size}{b.qty > 1 ? ` × ${b.qty}` : ""}</Text>
              <Text style={st.price}>{money(b.price * b.qty)}</Text>
            </View>
          ))}
          {g.origin.currency !== "USD" && <Text style={st.fx}>{g.retailer} is paid {inCurrency(g.sub, g.origin.currency, g.origin.perUSD)} · you pay {money(g.sub)}</Text>}
        </View>
      ))}

      <Text style={screen.section}>(02) Tillie Rewards</Text>
      {reward ? (
        <Pressable onPress={() => setUseReward((v) => !v)} style={[st.rewardRow, useReward && st.rewardOn]} accessibilityRole="switch" accessibilityState={{ checked: useReward }}>
          <Text style={st.rewardPts}>{points} pts</Text>
          <Text style={st.rewardText}>{useReward ? `Using ${reward.pts} pts for $${reward.off} off ✓` : `Use ${reward.pts} pts for $${reward.off} off`}</Text>
        </Pressable>
      ) : (
        <Text style={screen.muted}>{points} pts. Reach 100 to unlock $5 off. You'll earn {Math.round(subtotal)} pts on this order.</Text>
      )}

      <Text style={screen.section}>(03) Pay with</Text>
      {PAYMENTS.map((p) => (
        <Pressable key={p.key} onPress={() => setPay(p.key)} style={[st.payRow, pay === p.key && st.payOn]} accessibilityRole="radio" accessibilityState={{ selected: pay === p.key }}>
          <View style={[st.radio, pay === p.key && st.radioOn]} />
          {p.key === "visa" ? <View style={st.visa}><Text style={st.visaText}>VISA</Text></View> : null}
          <View style={{ flex: 1 }}>
            <Text style={st.payLabel}>{p.label}</Text>
            <Text style={[st.paySub, p.key === "intl" && { color: colors.danger }]}>{p.sub}</Text>
          </View>
        </Pressable>
      ))}

      <View style={st.summary}>
        <SummaryRow label="Items" value={money(subtotal)} />
        <SummaryRow label={`Shipping · ${groups.length} store${groups.length > 1 ? "s" : ""}`} value={money(shipping)} />
        <SummaryRow label="Duties & taxes · prepaid" value={money(duties)} />
        {discount > 0 && <SummaryRow label="Rewards discount" value={`−${money(discount)}`} />}
        {intlFee > 0 && <SummaryRow label="International card fee (est.)" value={money(intlFee)} />}
        <View style={st.divider} />
        <SummaryRow label="Total" value={money(total)} bold />
        {dest !== "US" && <Text style={st.local}>≈ {inCurrency(total, country.currency, country.perUSD)} in {country.name}</Text>}
      </View>

      <Button title={`Pay ${money(total)}`} onPress={() => onPay({ total, groups, pointsUsed: discount ? reward.pts : 0, payment: PAYMENTS.find((p) => p.key === pay).label })} />
      <Text style={screen.sample}>Prototype: sample rates, duties and fees. No real payment or order.</Text>
    </ScrollView>
  );
}

// ---------------- Verify (text code) ----------------
function Verify({ phone, total, onBack, onConfirm }) {
  const [code, setCode] = useState("");
  const last4 = String(phone || "0142").replace(/\D/g, "").slice(-4) || "0142";
  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
        <Text style={st.back}>‹ Back to checkout</Text>
      </Pressable>
      <RetroWindow title="verify_payment.exe" bar="blue">
        <View style={{ padding: 16, gap: 14, alignItems: "center" }}>
          <Icon name="sparkle" size={30} color={colors.pink} />
          <Text style={st.verifyTitle}>We texted you a code</Text>
          <Text style={[screen.muted, { textAlign: "center" }]}>Enter the 6-digit code we sent to (•••) •••-{last4} to confirm your {money(total)} payment.</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            style={st.codeInput}
            placeholder="••••••"
            placeholderTextColor={colors.soft2}
            accessibilityLabel="Verification code"
            textContentType="oneTimeCode"
          />
          <Text style={screen.sample}>Demo: any 6 digits work (try 246810).</Text>
          <Pressable hitSlop={8}><Text style={st.resend}>Resend code</Text></Pressable>
        </View>
      </RetroWindow>
      <Button title="Confirm payment" disabled={code.length !== 6} onPress={onConfirm} />
    </ScrollView>
  );
}

// ---------------- Done (confetti) ----------------
function Done({ order, onTrack, onClose }) {
  const country = countryOf(order.dest);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16, alignItems: "stretch" }}>
        <View style={st.doneBadge}><Text style={st.doneCheck}>✓</Text></View>
        <Text style={st.doneTitle}>Your order is{"\n"}<Text style={st.doneScript}>on the way!</Text></Text>
        <Text style={[screen.muted, { textAlign: "center" }]}>Paid {money(order.total)} with {order.payment} · Order {order.id}{"\n"}Shipping to {country.name}</Text>

        {order.groups.map((g, i) => (
          <View key={g.retailer} style={st.trackRow}>
            <View style={st.trackDot} />
            <View style={{ flex: 1 }}>
              <Text style={st.trackName}>{g.retailer} · {g.count} item{g.count > 1 ? "s" : ""}</Text>
              <Text style={st.delivery}>Ships from {g.origin} · arrives by {g.arrives}</Text>
              <Text style={st.tracking}>Tracking ID {order.id}-{i + 1}</Text>
            </View>
          </View>
        ))}

        <View style={st.globalBox}>
          <Sparkle size={16} />
          <Text style={st.globalText}>+{Math.round(order.total)} Tillie points earned{order.pointsUsed ? ` · ${order.pointsUsed} pts used` : ""}. Tillie also learned your sizes from this order.</Text>
        </View>
        <Button title="Track my packages" onPress={onTrack} />
        <Button title="Done" variant="ghost" onPress={onClose} />
        <Text style={[screen.sample, { textAlign: "center" }]}>Demo order · nothing was charged</Text>
      </ScrollView>
      <Confetti />
    </View>
  );
}

const CONFETTI_COLORS = [colors.pink, colors.soft2, colors.butter, colors.pinkTab, colors.ink];
function Confetti() {
  const { width } = Dimensions.get("window");
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      x: Math.random() * (width - 40),
      size: 6 + Math.random() * 8,
      delay: Math.random() * 500,
      dur: 1600 + Math.random() * 1400,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
      star: i % 6 === 0,
    })),
    [width]
  );
  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.parallel(
      anims.map((a, i) => Animated.timing(a, { toValue: 1, duration: pieces[i].dur, delay: pieces[i].delay, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    ).start();
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateY = anims[i].interpolate({ inputRange: [0, 1], outputRange: [-30, 620] });
        const rotate = anims[i].interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] });
        const opacity = anims[i].interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return p.star ? (
          <Animated.Text key={i} style={{ position: "absolute", left: p.x, top: 0, fontSize: p.size * 2, color: p.color, opacity, transform: [{ translateY }, { rotate }] }}>✦</Animated.Text>
        ) : (
          <Animated.View key={i} style={{ position: "absolute", left: p.x, top: 0, width: p.size, height: p.size * 0.6, backgroundColor: p.color, borderRadius: 2, opacity, transform: [{ translateY }, { rotate }] }} />
        );
      })}
    </View>
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
  tabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tab: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1.5, borderColor: colors.soft2, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  tabOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  tabText: { fontFamily: fonts.pixel, fontSize: 19, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  retailer: { color: colors.pink, fontSize: 15, fontFamily: fonts.pixel },
  name: { color: colors.ink2, fontSize: 15, fontFamily: fonts.semibold },
  meta: { color: colors.muted, fontSize: 13, fontFamily: fonts.regular },
  price: { color: colors.ink2, fontSize: 15, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.soft2, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  qty: { minWidth: 18, textAlign: "center", fontFamily: fonts.bold, color: colors.ink, fontVariant: ["tabular-nums"] },
  remove: { color: colors.danger, fontSize: 13, fontFamily: fonts.bold },
  footer: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  totalLabel: { color: colors.ink2, fontSize: 15, flex: 1, fontFamily: fonts.regular },
  totalValue: { color: colors.ink2, fontSize: 18, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  back: { color: colors.ink, fontSize: 18, fontFamily: fonts.pixel },
  address: { fontSize: 13, color: colors.muted, fontFamily: fonts.regular },
  globalBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.butter, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E8DD9A" },
  globalText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.ink2, fontFamily: fonts.medium },
  group: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.line },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 22, fontFamily: fonts.pixel, color: colors.ink },
  badge: { fontSize: 14, fontFamily: fonts.pixel, color: colors.ink, backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  badgeCross: { backgroundColor: colors.pink, color: "#FFFFFF" },
  delivery: { fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  lineName: { flex: 1, color: colors.ink2, fontSize: 14, fontFamily: fonts.regular },
  fx: { fontSize: 12, color: colors.ink, fontFamily: fonts.medium, marginTop: 4 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: colors.soft2, backgroundColor: colors.card },
  rewardOn: { borderColor: colors.pink, backgroundColor: colors.pinkSoft },
  rewardPts: { fontFamily: fonts.pixel, fontSize: 24, color: colors.pink },
  rewardText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink2 },
  payRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  payOn: { borderColor: colors.ink },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.soft2 },
  radioOn: { borderColor: colors.pink, backgroundColor: colors.pink },
  payLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink2 },
  paySub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  visa: { width: 46, height: 30, borderRadius: 5, backgroundColor: "#1A1F71", alignItems: "center", justifyContent: "center" },
  visaText: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 12, fontStyle: "italic", letterSpacing: 1 },
  summary: { backgroundColor: colors.soft, borderRadius: 16, padding: 14, gap: 8 },
  divider: { height: 1, backgroundColor: colors.soft2, marginVertical: 2 },
  local: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium, textAlign: "right" },
  verifyTitle: { fontFamily: fonts.pixel, fontSize: 28, color: colors.ink },
  codeInput: { fontFamily: fonts.pixel, fontSize: 40, letterSpacing: 10, textAlign: "center", color: colors.pink, borderBottomWidth: 2, borderBottomColor: colors.pink, minWidth: 220, paddingVertical: 4 },
  resend: { fontFamily: fonts.pixel, fontSize: 17, color: colors.ink, textDecorationLine: "underline" },
  paying: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  payTitle: { fontSize: 26, fontFamily: fonts.pixel, color: colors.ink, marginBottom: 6 },
  doneBadge: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center", marginTop: 6, borderWidth: 4, borderColor: colors.pinkTab },
  doneCheck: { fontSize: 46, color: "#FFFFFF", fontFamily: fonts.pixel },
  doneTitle: { fontSize: 38, fontFamily: fonts.pixel, color: colors.ink, textAlign: "center", lineHeight: 44 },
  doneScript: { fontFamily: fonts.script, fontSize: 48, color: colors.pink },
  trackRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.line },
  trackDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, marginTop: 4 },
  trackName: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink2 },
  tracking: { fontSize: 12, color: colors.pink, fontFamily: fonts.semibold, marginTop: 2 },
  orderCard: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line },
  orderHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  orderId: { fontFamily: fonts.pixel, fontSize: 22, color: colors.ink },
  statusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: colors.butter },
  statusDone: { backgroundColor: colors.success },
  statusText: { fontFamily: fonts.pixel, fontSize: 15, color: colors.ink2 },
  track: { gap: 4, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  timeline: { flexDirection: "row", marginTop: 8 },
  tlStep: { flex: 1, alignItems: "center" },
  tlDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.soft, borderWidth: 2, borderColor: colors.soft2, zIndex: 2 },
  tlDotOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  tlLine: { position: "absolute", top: 6, left: "50%", right: "-50%", height: 2, backgroundColor: colors.soft2 },
  tlLineOn: { backgroundColor: colors.pink },
  tlLabel: { fontFamily: fonts.pixel, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 4, lineHeight: 13 },
});
