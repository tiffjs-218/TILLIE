// Outfit Studio, the main feature.
// Stage: mannequin with a layer rail on the left (tap a layer to select it) and ‹ › to cycle pieces.
// Below: the selected piece, a lock switch for shuffling, and layer order controls.
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import BodySim from "../components/BodySim";
import GarmentThumb from "../components/GarmentThumb";
import Icon from "../components/Icon";
import { Button, Header, Sheet, screen } from "../components/ui";
import { outfitPieces, outfitTotal, useApp } from "../store";
import { CATEGORIES, colors, fonts, money } from "../theme";

const labelOf = (key) => CATEGORIES.find((c) => c.key === key);

export default function StudioScreen({ onBag, onDiscover }) {
  const { state, actions } = useApp();
  const { closet, outfit, layerOrder, locked, saved } = state;
  const [selected, setSelected] = useState("top");
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);

  const options = closet.filter((p) => p.category === selected);
  const currentIdx = options.findIndex((p) => p.uid === outfit[selected]?.uid);
  const current = outfit[selected];
  const pieces = outfitPieces(outfit);

  function cycle(dir) {
    if (!options.length) return;
    const next = currentIdx === -1 ? 0 : (currentIdx + dir + options.length) % options.length;
    actions.wear(selected, options[next]);
  }

  function move(dir) {
    const order = [...layerOrder];
    const i = order.indexOf(selected);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    actions.setLayerOrder(order);
  }

  function save() {
    actions.saveOutfit(name.trim() || `Outfit ${saved.length + 1}`);
    setName("");
    setSaveOpen(false);
  }

  if (!closet.length) {
    return (
      <ScrollView contentContainerStyle={screen.page}>
        <Header title="Your" emphasis="studio" bagCount={bagCount} onBag={onBag} />
        <View style={[st.stage, { alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }]}>
          <BodySim scale={0.9} profile={state.profile} />
          <Text style={[screen.muted, { textAlign: "center" }]}>Shop a look on Discover and tap "Try in studio" to start building outfits.</Text>
          <Button title="Go to Discover" onPress={onDiscover} />
        </View>
      </ScrollView>
    );
  }

  const order = layerOrder.indexOf(selected);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={screen.page}>
        <Header title="Your" emphasis="studio" subtitle={`${pieces.length} pieces · ${money(outfitTotal(outfit))}`} bagCount={bagCount} onBag={onBag} />

        <View style={st.stage}>
          <View style={st.stageBorder} pointerEvents="none" />
          <Text style={st.handnote}>tap a layer, then swipe through</Text>

          {/* mannequin */}
          <View style={st.avatarZone}>
            <View style={st.oval} />
            <BodySim outfit={outfit} layerOrder={layerOrder} profile={state.profile} scale={1.0} />
          </View>

          {/* layer rail */}
          <View style={st.rail} accessibilityLabel="Clothing layers, outermost first">
            {layerOrder.map((key) => {
              const cat = labelOf(key);
              const piece = outfit[key];
              const on = selected === key;
              return (
                <Pressable key={key} onPress={() => setSelected(key)} style={[st.layer, on && st.layerOn]}
                  accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${cat.label}${piece ? `: ${piece.name}` : ", empty"}`}>
                  {piece ? (
                    <GarmentThumb category={piece.category} name={piece.name} color={piece.color} size={46} background="transparent" />
                  ) : (
                    <View style={st.layerEmpty}><Icon name="plus" size={16} color={colors.muted} /></View>
                  )}
                  <Text style={st.layerLabel} numberOfLines={1}>{cat.short}</Text>
                  {locked[key] && <View style={st.lockBadge}><Icon name="lock" size={10} color="#FFFFFF" strokeWidth={2.4} /></View>}
                </Pressable>
              );
            })}
          </View>

          {/* cycle arrows */}
          <Pressable onPress={() => cycle(-1)} style={[st.cycle, { left: 94 }]} accessibilityLabel={`Previous ${labelOf(selected).label}`} disabled={!options.length}>
            <Icon name="back" size={18} />
          </Pressable>
          <Pressable onPress={() => cycle(1)} style={[st.cycle, { right: 12 }]} accessibilityLabel={`Next ${labelOf(selected).label}`} disabled={!options.length}>
            <Icon name="next" size={18} />
          </Pressable>
        </View>

        {/* selected piece */}
        <View style={st.editor}>
          {current ? (
            <GarmentThumb category={current.category} name={current.name} color={current.color} size={52} background={colors.card} />
          ) : (
            <View style={[st.layerEmpty, { width: 52, height: 52 }]}><Icon name="plus" size={18} color={colors.muted} /></View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.editorCat}>{labelOf(selected).label}{options.length ? ` · ${currentIdx + 1 || "–"}/${options.length}` : ""}</Text>
            <Text style={st.editorName} numberOfLines={1}>{current ? current.name : options.length ? "Not wearing one, tap ›" : "Nothing here yet"}</Text>
            {current ? <Text style={st.editorMeta}>{current.retailer} · {current.colorName} · {money(current.price)}</Text> : null}
          </View>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Switch value={!!locked[selected]} onValueChange={() => actions.toggleLock(selected)} trackColor={{ true: colors.ink, false: "#CFC4CA" }} thumbColor="#FFFFFF"
              accessibilityLabel={`Lock ${labelOf(selected).label} when shuffling`} />
            <Text style={st.lockLabel}>{locked[selected] ? "Locked" : "Lock"}</Text>
          </View>
        </View>

        <View style={st.orderRow}>
          <Text style={st.orderLabel}>Layer order</Text>
          <Pressable onPress={() => move(-1)} disabled={order === 0} style={[st.orderBtn, order === 0 && { opacity: 0.35 }]} accessibilityLabel="Move this layer outward">
            <Text style={st.orderBtnText}>Outer ↑</Text>
          </Pressable>
          <Pressable onPress={() => move(1)} disabled={order === layerOrder.length - 1} style={[st.orderBtn, order === layerOrder.length - 1 && { opacity: 0.35 }]} accessibilityLabel="Move this layer inward">
            <Text style={st.orderBtnText}>Inner ↓</Text>
          </Pressable>
          {current ? (
            <Pressable onPress={() => actions.wear(selected, null)} style={st.orderBtn} accessibilityLabel="Take this piece off">
              <Text style={st.orderBtnText}>Take off</Text>
            </Pressable>
          ) : null}
        </View>

        <Button title="Shuffle outfit" variant="soft" icon="shuffle" onPress={actions.shuffle} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Save outfit" variant="outline" disabled={!pieces.length} onPress={() => setSaveOpen(true)} style={{ flex: 1 }} />
          <Button title="Add to bag" disabled={!pieces.length} onPress={() => actions.addToBag(pieces)} style={{ flex: 1 }} />
        </View>
        <Text style={screen.sample}>Illustrative preview, not an exact virtual try-on.</Text>
      </ScrollView>

      <Sheet visible={saveOpen} onClose={() => setSaveOpen(false)} title="Save outfit" height="45%">
        <View style={{ gap: 14 }}>
          <Text style={screen.label}>Name this outfit</Text>
          <TextInput value={name} onChangeText={setName} placeholder={`Outfit ${saved.length + 1} (e.g. Halloween)`} placeholderTextColor={colors.muted}
            style={screen.input} autoFocus returnKeyType="done" onSubmitEditing={save} accessibilityLabel="Outfit name" />
          <Button title="Save" onPress={save} />
        </View>
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  stage: { height: 500, borderRadius: 28, backgroundColor: colors.soft, overflow: "hidden", borderWidth: 1, borderColor: "#D2D9E6" },
  stageBorder: { position: "absolute", top: 10, left: 10, right: 10, bottom: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "#B9C3D4", borderRadius: 22 },
  handnote: { position: "absolute", top: 20, right: 22, color: colors.muted, fontFamily: fonts.serifItalic, fontSize: 12, transform: [{ rotate: "-4deg" }] },
  avatarZone: { position: "absolute", left: 76, right: 0, top: 30, bottom: 10, alignItems: "center", justifyContent: "center" },
  oval: { position: "absolute", bottom: 22, width: 190, height: 30, borderRadius: 95, backgroundColor: colors.soft2 },
  rail: { position: "absolute", left: 14, top: 24, gap: 8 },
  layer: { width: 66, height: 82, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "#D2D9E6", alignItems: "center", justifyContent: "center", gap: 2 },
  layerOn: { borderWidth: 2, borderColor: colors.ink, backgroundColor: "#FFFFFF" },
  layerEmpty: { width: 46, height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.chipLine, alignItems: "center", justifyContent: "center" },
  layerLabel: { fontSize: 10, fontFamily: fonts.bold, color: colors.ink, textTransform: "uppercase", letterSpacing: 0.6 },
  lockBadge: { position: "absolute", top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  cycle: { position: "absolute", top: "46%", width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#6C5975", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  editor: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  editorCat: { fontSize: 10, color: colors.muted, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 1 },
  editorName: { fontSize: 15, fontFamily: fonts.semibold, color: colors.ink },
  editorMeta: { fontSize: 12, color: colors.muted, fontFamily: fonts.regular },
  lockLabel: { fontSize: 10, color: colors.muted, fontFamily: fonts.medium },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  orderLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink, marginRight: "auto" },
  orderBtn: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, minHeight: 36, justifyContent: "center" },
  orderBtnText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.ink },
});
