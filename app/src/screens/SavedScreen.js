// Saved: outfit cards (thumbnail, name, item count, total). Open one to restore it in
// the Studio, check out the whole outfit, post it to Community, rename or delete it.
import { useState } from "react";
import { FlatList, ScrollView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import BodySim from "../components/BodySim";
import { Button, Header, Sheet, screen } from "../components/ui";
import GarmentThumb from "../components/GarmentThumb";
import { outfitPieces, outfitTotal, useApp } from "../store";
import { categoryLabel, colors, money, fonts } from "../theme";

export default function SavedScreen({ onBag, onOpenStudio }) {
  const { state, actions } = useApp();
  const [openId, setOpenId] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = state.saved.find((o) => o.id === openId);
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);
  const published = (id) => state.community.some((c) => c.mine && c.sourceId === id);

  const close = () => {
    setOpenId(null);
    setRenaming(false);
    setConfirmDelete(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={state.saved}
        keyExtractor={(o) => o.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={screen.page}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Header title="Saved" emphasis="looks" subtitle={`${state.saved.length} outfits`} bagCount={bagCount} onBag={onBag} />
            <Text style={screen.muted}>Only finished outfits live here. Build one in the Studio and tap Save outfit. Single pieces go to your Closet.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={screen.muted}>No outfits yet. Build one in the Studio and tap Save outfit.</Text>}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => setOpenId(o.id)} accessibilityRole="button" style={st.card}>
            <View style={st.thumb}>
              <BodySim outfit={o.items} layerOrder={o.layerOrder} profile={state.profile} scale={0.5} />
            </View>
            <Text style={st.cardName} numberOfLines={1}>{o.name}</Text>
            <Text style={st.meta}>{outfitPieces(o.items).length} items · {money(outfitTotal(o.items))}</Text>
          </Pressable>
        )}
      />

      <Sheet visible={!!open} onClose={close} title={open?.name || ""} height="90%">
        {open && (
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
            <View style={[st.thumb, { paddingVertical: 14 }]}>
              <BodySim outfit={open.items} layerOrder={open.layerOrder} profile={state.profile} scale={0.8} />
            </View>

            {renaming ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput value={draft} onChangeText={setDraft} style={[screen.input, { flex: 1 }]} autoFocus accessibilityLabel="Outfit name" />
                <Button small title="Save" onPress={() => { actions.renameOutfit(open.id, draft.trim() || open.name); setRenaming(false); }} style={{ minHeight: 48 }} />
              </View>
            ) : null}

            {outfitPieces(open.items).map((p) => (
              <View key={p.uid} style={st.row}>
                <GarmentThumb category={p.category} name={p.name} color={p.color} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.itemName} numberOfLines={1}>{p.name}</Text>
                  <Text style={st.meta}>{categoryLabel(p.category)} · {p.retailer} · {p.size}</Text>
                </View>
                <Text style={st.price}>{money(p.price)}</Text>
              </View>
            ))}

            <Button title={`Checkout whole outfit · ${money(outfitTotal(open.items))}`} onPress={() => { actions.addToBag(outfitPieces(open.items)); close(); setTimeout(onBag, 450); }} />
            <Button title="Open in Studio" variant="lavender" onPress={() => { actions.loadOutfit(open); close(); onOpenStudio(); }} />
            <Button
              title={published(open.id) ? "Posted to Community" : "Post to Community · +10 pts"}
              variant="secondary"
              disabled={published(open.id)}
              onPress={() => actions.publish({ ...open, sourceId: open.id })}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button small title="Rename" variant="secondary" style={{ flex: 1 }} onPress={() => { setDraft(open.name); setRenaming(true); }} />
              {confirmDelete ? (
                <Button small title="Tap again to delete" variant="secondary" style={{ flex: 1, borderColor: colors.danger }} onPress={() => { actions.deleteOutfit(open.id); close(); }} />
              ) : (
                <Button small title="Delete" variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmDelete(true)} />
              )}
            </View>
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  card: { flex: 1, maxWidth: "50%", backgroundColor: colors.card, borderRadius: 20, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.line },
  thumb: { backgroundColor: colors.lavender, borderRadius: 16, alignItems: "center", paddingVertical: 8 },
  cardName: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold, marginTop: 6 },
  meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, fontVariant: ["tabular-nums"] },
  fav: { width: 110, backgroundColor: colors.card, borderRadius: 16, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.line },
  favName: { fontSize: 12, fontFamily: fonts.semibold, color: colors.ink, minHeight: 30 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.line },
  itemName: { color: colors.ink, fontSize: 15, fontFamily: fonts.semibold },
  price: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
});
