// "Shop this look" bottom sheet (3/4 of the screen).
// Steps: detected items checklist → compare similar products (filters + sort) → product details.
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { findSimilar } from "../api";
import { recommendSize } from "../sizing";
import { useApp } from "../store";
import { categoryLabel, colors, makePiece, money, shopUrl, fonts } from "../theme";
import { Button, Checkbox, Chip, ColorDot, Pill, Sheet, screen } from "./ui";
import GarmentThumb from "./GarmentThumb";
import products from "../data/products.json";

// best product for a detected item: its exact match, or the closest color in that category
function productFor(item) {
  if (item.matchId) { const m = products.find((p) => p.id === item.matchId); if (m) return m; }
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const d = (a, b) => { const x = rgb(a); const y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  return products.filter((p) => p.category === item.category).sort((a, b) => Math.min(...a.colors.map((c) => d(c, item.color))) - Math.min(...b.colors.map((c) => d(c, item.color))))[0];
}

const BUDGETS = [
  { key: "any", label: "Any price", max: Infinity },
  { key: "25", label: "Under $25", max: 25 },
  { key: "50", label: "Under $50", max: 50 },
];
const SORTS = [
  { key: "match", label: "Best match" },
  { key: "low", label: "Price: low" },
  { key: "high", label: "Price: high" },
];

export default function ShopSheet({ visible, job, onClose, onOpenStudio }) {
  const [step, setStep] = useState("select");
  const [checked, setChecked] = useState([]); // detected item ids to compare
  const [index, setIndex] = useState(0); // which checked item we're comparing
  const [product, setProduct] = useState(null); // product open in details

  useEffect(() => {
    setStep("select");
    setChecked([]);
    setIndex(0);
    setProduct(null);
  }, [job?.key]);

  const selectedItems = (job?.items || []).filter((it) => checked.includes(it.id));
  const current = selectedItems[index];

  const title =
    step === "select" ? "Shop this look" : step === "detail" ? product?.retailer || "Details" : `${categoryLabel(current?.category)} · ${index + 1} of ${selectedItems.length}`;

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {step === "select" && (
        <SelectStep
          job={job}
          checked={checked}
          onToggle={(id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))}
          onNext={() => {
            setIndex(0);
            setStep("compare");
          }}
        />
      )}
      {step === "compare" && current && (
        <CompareStep
          key={current.id}
          item={current}
          isLast={index === selectedItems.length - 1}
          onBack={() => setStep("select")}
          onOpen={(p) => {
            setProduct(p);
            setStep("detail");
          }}
          onNext={() => setIndex((i) => i + 1)}
          onDone={() => {
            onClose();
            onOpenStudio();
          }}
        />
      )}
      {step === "detail" && product && <DetailStep product={product} onBack={() => setStep("compare")} />}
    </Sheet>
  );
}

function SelectStep({ job, checked, onToggle, onNext }) {
  const { state, actions } = useApp();
  const saveAll = () => {
    (job?.items || []).filter((it) => checked.includes(it.id)).forEach((it) => {
      const p = productFor(it);
      if (!p) return;
      const ci = Math.max(0, p.colors.findIndex((c) => c.toLowerCase() === String(it.color).toLowerCase()));
      const size = recommendSize(p, state.purchases, state.profile)?.size || p.sizes[0];
      actions.addToCloset(makePiece(p, ci, size));
    });
  };
  if (!job || job.status === "loading") {
    return (
      <View style={st.center}>
        {job?.imageUri ? <Image source={{ uri: job.imageUri }} style={st.thumb} /> : null}
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={screen.muted}>{job?.simulated ? "Finding pieces in this look…" : "Gemini is finding the clothes…"}</Text>
      </View>
    );
  }
  if (job.status === "error") {
    return (
      <View style={st.center}>
        <Text style={st.error}>{job.error}</Text>
        <Text style={screen.muted}>Check that the server is running and SERVER_URL in src/config.js is right.</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={job.items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 2 }}>
            {(job.simulated || job.demo) && (
              <View style={st.banner}>
                <Text style={st.bannerText}>
                  {job.demo ? "Couldn't reach the AI server. Showing simulated detection." : "Simulated detection for this demo video."}
                </Text>
              </View>
            )}
            <Text style={screen.muted}>Pick the pieces you want to compare.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={screen.muted}>No clothing found. Try another screenshot.</Text>}
        renderItem={({ item }) => {
          const on = checked.includes(item.id);
          return (
            <Pressable onPress={() => onToggle(item.id)} style={[st.row, on && st.rowOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Checkbox checked={on} onPress={() => onToggle(item.id)} label={item.name} />
              <GarmentThumb category={item.category} name={item.name} color={item.color} size={52} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Chip label={categoryLabel(item.category)} />
                <Text style={st.name} numberOfLines={2}>{item.name}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <Button title={checked.length ? `Save ${checked.length} to closet + studio` : "Select a piece"} disabled={!checked.length} onPress={saveAll} />
      <Button title="Compare prices first" variant="outline" disabled={!checked.length} onPress={onNext} style={{ marginTop: 8 }} />
    </View>
  );
}

function CompareStep({ item, isLast, onBack, onOpen, onNext, onDone }) {
  const { state, actions } = useApp();
  const [data, setData] = useState({ loading: true, items: [], shoppingUrl: "" });
  const [budget, setBudget] = useState("any");
  const [sort, setSort] = useState("match");
  const [mySize, setMySize] = useState(false);
  const [color, setColor] = useState(null);

  useEffect(() => {
    findSimilar(item).then((res) => setData({ loading: false, ...res }));
  }, [item]);

  const colorOptions = useMemo(() => {
    const seen = new Map();
    data.items.forEach((p) => p.colors.forEach((c, i) => !seen.has(p.colorNames[i]) && seen.set(p.colorNames[i], c)));
    return [...seen.entries()].slice(0, 8);
  }, [data.items]);

  const size = state.profile.size;
  const fitFor = (p) => recommendSize(p, state.purchases, state.profile)?.size;
  const results = useMemo(() => {
    const max = BUDGETS.find((b) => b.key === budget).max;
    let list = data.items.filter((p) => p.price <= max);
    if (mySize) list = list.filter((p) => p.sizes.includes(fitFor(p) || size) || p.sizes.includes("One size"));
    if (color) list = list.filter((p) => p.colorNames.includes(color));
    if (sort === "match" && item.matchId) list = [...list].sort((a, b) => (b.id === item.matchId) - (a.id === item.matchId));
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [data.items, budget, sort, mySize, color, size]);

  const pieceFor = (p) => {
    const ci = color ? Math.max(0, p.colorNames.indexOf(color)) : 0;
    const rec = fitFor(p);
    const sz = rec || (p.sizes.includes(size) ? size : p.sizes[0]);
    return makePiece(p, ci, sz);
  };
  const saved = (p) => state.closet.some((c) => c.productId === p.id);

  return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" style={{ marginBottom: 8 }}>
        <Text style={st.back}>‹ Pieces in this look</Text>
      </Pressable>
      <View style={st.pickedRow}>
        <GarmentThumb category={item.category} name={item.name} color={item.color} size={34} />
        <Text style={st.pickedName} numberOfLines={1}>Similar to: {item.name}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.filters}>
        {BUDGETS.map((b) => <Pill key={b.key} label={b.label} selected={budget === b.key} onPress={() => setBudget(b.key)} />)}
        <Pill label="In my size" selected={mySize} onPress={() => setMySize((v) => !v)} />
        {SORTS.map((o) => <Pill key={o.key} label={o.label} selected={sort === o.key} onPress={() => setSort(o.key)} />)}
      </ScrollView>
      {colorOptions.length > 1 && (
        <View style={st.colorRow}>
          <Text style={st.filterLabel}>Color</Text>
          {colorOptions.map(([name, hex]) => (
            <ColorDot key={name} color={hex} label={name} selected={color === name} onPress={() => setColor((c) => (c === name ? null : name))} />
          ))}
        </View>
      )}

      {data.loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
          ListEmptyComponent={<Text style={screen.muted}>Nothing matches these filters. Try a higher budget or clear the color.</Text>}
          renderItem={({ item: p }) => (
            <Pressable onPress={() => onOpen(p)} style={st.card} accessibilityRole="button" accessibilityLabel={`${p.name} from ${p.retailer}, ${money(p.price)}. Open details`}>
              <View style={st.cardTop}>
                <GarmentThumb category={p.category} name={p.name} color={color ? p.colors[Math.max(0, p.colorNames.indexOf(color))] : p.colors[0]} size={72} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  {p.id === item.matchId && <Chip label="Exact match" />}
                  <Text style={st.retailer}>{p.retailer}</Text>
                  <Text style={st.name} numberOfLines={2}>{p.name}</Text>
                  {p.details ? <Text style={st.details} numberOfLines={1}>{p.details}</Text> : null}
                  <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                    {p.colors.map((c) => <ColorDot key={c} color={c} size={14} />)}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={st.price}>{money(p.price)}</Text>
                  {fitFor(p) ? <Text style={st.fit}>Your size: {fitFor(p)}</Text> : null}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title={saved(p) ? "In closet + studio ✓" : "Save to closet"} variant="outline" small style={{ flex: 1 }} disabled={saved(p)} onPress={() => actions.addToCloset(pieceFor(p))} />
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={screen.sample}>Sample listings and prices for the prototype.</Text>
              {data.shoppingUrl ? (
                <Pressable onPress={() => Linking.openURL(data.shoppingUrl)} accessibilityRole="link">
                  <Text style={st.link}>Search real listings on Google Shopping ›</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
      {isLast ? <Button title="Done · see my closet" onPress={onDone} /> : <Button title="Next piece ›" onPress={onNext} />}
    </View>
  );
}

function DetailStep({ product: p, onBack }) {
  const { state, actions } = useApp();
  const [ci, setCi] = useState(0);
  const rec = recommendSize(p, state.purchases, state.profile);
  const [size, setSize] = useState(rec?.size || (p.sizes.includes(state.profile.size) ? state.profile.size : p.sizes[0]));
  const inCloset = state.closet.some((c) => c.productId === p.id);
  const piece = makePiece(p, ci, size);

  return (
    <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
        <Text style={st.back}>‹ Back to results</Text>
      </Pressable>

      {/* gallery: swipe through colors with the arrows */}
      <View style={st.gallery}>
        <Pressable onPress={() => setCi((i) => (i - 1 + p.colors.length) % p.colors.length)} style={st.arrow} accessibilityLabel="Previous color" hitSlop={8}>
          <Text style={st.arrowText}>‹</Text>
        </Pressable>
        <View style={st.galleryImage}>
          <GarmentThumb category={p.category} name={p.name} color={p.colors[ci]} size={190} background={colors.card} radius={22} />
          <Text style={st.galleryCaption}>{p.colorNames[ci]}</Text>
        </View>
        <Pressable onPress={() => setCi((i) => (i + 1) % p.colors.length)} style={st.arrow} accessibilityLabel="Next color" hitSlop={8}>
          <Text style={st.arrowText}>›</Text>
        </Pressable>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={st.retailer}>{p.retailer}</Text>
        <Text style={st.detailName}>{p.name}</Text>
        <Text style={st.detailPrice}>{money(p.price)}</Text>
        {p.details ? <Text style={screen.muted}>{p.details}</Text> : null}
        <Text style={screen.sample}>Sample price</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={screen.label}>Color: {p.colorNames[ci]}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {p.colors.map((c, i) => <ColorDot key={c} color={c} label={p.colorNames[i]} selected={ci === i} onPress={() => setCi(i)} size={28} />)}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={screen.label}>Size</Text>
        {rec ? (
          <View style={st.fitBox}>
            <Text style={st.fitTitle}>Tillie fit: {rec.size} at {p.retailer}</Text>
            <Text style={st.fitText}>{rec.reason}. {p.retailer} sizes run differently, so Tillie translated it for you.</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {p.sizes.map((sz) => <Pill key={sz} label={rec?.size === sz ? `${sz} ✓` : sz} selected={size === sz} onPress={() => setSize(sz)} />)}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title={inCloset ? "In closet ✓" : "Save to closet"} variant="outline" style={{ flex: 1 }} disabled={inCloset} onPress={() => actions.addToCloset(piece)} />
        <Button title="Add to bag" variant="outline" style={{ flex: 1 }} onPress={() => actions.addToBag([piece])} />
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 12 },
  thumb: { width: 110, height: 180, borderRadius: 14, opacity: 0.85 },
  error: { color: colors.danger, fontSize: 15, fontFamily: fonts.semibold, textAlign: "center" },
  banner: { backgroundColor: colors.lavender, borderRadius: 12, padding: 10 },
  bannerText: { color: colors.lavenderInk, fontSize: 13, fontFamily: fonts.semibold },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 18, padding: 12, borderWidth: 1.5, borderColor: colors.line },
  rowOn: { borderColor: colors.accent },
  name: { color: colors.ink, fontSize: 15, fontFamily: fonts.semibold },
  back: { color: colors.accent, fontSize: 15, fontFamily: fonts.bold },
  pickedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  pickedName: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  filters: { gap: 8, paddingBottom: 10, paddingRight: 8 },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10, flexWrap: "wrap" },
  filterLabel: { color: colors.muted, fontSize: 13, fontFamily: fonts.semibold, marginRight: 4 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.line },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  retailer: { color: colors.muted, fontSize: 12, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.8 },
  price: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  link: { color: colors.accent, fontSize: 14, fontFamily: fonts.semibold },
  gallery: { flexDirection: "row", alignItems: "center", gap: 8 },
  galleryImage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  details: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  fit: { fontSize: 11, fontFamily: fonts.bold, color: colors.ink, backgroundColor: colors.yellow, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  fitBox: { backgroundColor: colors.soft, borderRadius: 14, padding: 12, gap: 3 },
  fitTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink },
  fitText: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, lineHeight: 17 },
  galleryCaption: { backgroundColor: "rgba(255,255,255,0.9)", color: colors.ink, fontFamily: fonts.bold, fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  arrow: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  arrowText: { fontFamily: fonts.regular, fontSize: 32, color: colors.ink },
  detailName: { color: colors.ink, fontSize: 22, fontFamily: fonts.bold },
  detailPrice: { color: colors.ink, fontSize: 20, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
});
