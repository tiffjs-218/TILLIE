// Community: two-column feed of outfits people built. Like or dislike, "Try this look"
// loads it into the Studio. Posting your own outfits earns creator points (concept only).
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import BodySim from "../components/BodySim";
import { Button, Header, Sheet, screen } from "../components/ui";
import Icon from "../components/Icon";
import { outfitTotal, useApp } from "../store";
import { colors, money, fonts } from "../theme";

export default function CommunityScreen({ onBag, onOpenStudio }) {
  const { state, actions } = useApp();
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);
  const [findOpen, setFindOpen] = useState(false);

  return (
    <>
    <FlatList
      data={state.community}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={screen.page}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Header title="The" emphasis="community" subtitle="Outfits built by Tillie users" bagCount={bagCount} onBag={onBag} />
          <Pressable onPress={() => setFindOpen(true)} style={st.findBtn} accessibilityRole="button">
            <Icon name="community" size={18} />
            <Text style={st.findText}>Find friends</Text>
            <Text style={st.findCount}>{state.friends.length} following</Text>
          </Pressable>
          <View style={st.points}>
            <View style={{ flex: 1 }}>
              <Text style={st.pointsNum}>{state.points} pts ✦</Text>
              <Text style={st.pointsText}>Post outfits (+25) and shop (+1 per $1). Spend points as discounts at Zara, Aritzia, Uniqlo and more. See Profile → Rewards.</Text>
            </View>
          </View>
          <Text style={screen.sample}>Prototype: sample rewards. Creator commission is a concept.</Text>
        </View>
      }
      renderItem={({ item: post }) => {
        const mine = state.liked[post.id] || 0;
        const likes = post.likes + (mine === 1 ? 1 : 0);
        return (
          <View style={st.card}>
            <View style={st.thumb}>
              <BodySim outfit={post.items} layerOrder={post.layerOrder} profile={state.profile} scale={0.5} />
            </View>
            <Text style={st.creator}>{post.creator}</Text>
            <Text style={st.name} numberOfLines={1}>{post.name}</Text>
            <Text style={st.meta}>{money(outfitTotal(post.items))}</Text>
            <View style={st.reactions}>
              <Pressable onPress={() => actions.react(post.id, 1)} accessibilityRole="button" accessibilityState={{ selected: mine === 1 }}
                accessibilityLabel={`Like, ${likes} likes`} style={[st.react, mine === 1 && st.reactOn]} hitSlop={4}>
                <Text style={[st.reactText, mine === 1 && { color: colors.accent }]}>♥ {likes}</Text>
              </Pressable>
              <Pressable onPress={() => actions.react(post.id, -1)} accessibilityRole="button" accessibilityState={{ selected: mine === -1 }}
                accessibilityLabel="Dislike" style={[st.react, mine === -1 && st.reactOn]} hitSlop={4}>
                <Text style={[st.reactText, mine === -1 && { color: colors.ink }]}>✕</Text>
              </Pressable>
            </View>
            <Button small title="Try this look" variant="lavender" onPress={() => { actions.loadOutfit(post); onOpenStudio(); }} />
          </View>
        );
      }}
    />
    <FindFriends visible={findOpen} onClose={() => setFindOpen(false)} />
    </>
  );
}

// Sample people to search (prototype)
const PEOPLE = [
  { handle: "@maya.styles", name: "Maya Chen", note: "12 mutual friends" },
  { handle: "@jun.wears", name: "Jun Park", note: "UW · 8 mutual friends" },
  { handle: "@thriftqueen", name: "Priya S.", note: "Thrift + vintage" },
  { handle: "@ari.fits", name: "Ari Lopez", note: "5 mutual friends" },
  { handle: "@tiffjs", name: "Tiffany", note: "Your teammate" },
  { handle: "@dubhacks.fits", name: "DubHacks Style", note: "Hackathon looks" },
];

function FindFriends({ visible, onClose }) {
  const { state, actions } = useApp();
  const [q, setQ] = useState("");
  const list = PEOPLE.filter((p) => (p.handle + p.name).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet visible={visible} onClose={onClose} title="Find friends" height="70%">
      <TextInput value={q} onChangeText={setQ} placeholder="Search by name or @username" placeholderTextColor={colors.muted}
        style={screen.input} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search friends" />
      <FlatList
        data={list}
        keyExtractor={(p) => p.handle}
        contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 12 }}
        ListEmptyComponent={<Text style={screen.muted}>No one found. Try another name.</Text>}
        renderItem={({ item: p }) => {
          const on = state.friends.includes(p.handle);
          return (
            <View style={st.person}>
              <View style={st.avatar}><Text style={st.avatarText}>{p.name[0]}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.personName}>{p.name}</Text>
                <Text style={st.personMeta}>{p.handle} · {p.note}</Text>
              </View>
              <Button small title={on ? "Following" : "Follow"} variant={on ? "outline" : "primary"} onPress={() => actions.toggleFriend(p.handle)} />
            </View>
          );
        }}
      />
      <Text style={screen.sample}>Sample people for the prototype.</Text>
    </Sheet>
  );
}

const st = StyleSheet.create({
  findBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.chipLine, borderRadius: 22, paddingHorizontal: 14, minHeight: 40, backgroundColor: colors.card },
  findText: { fontSize: 18, fontFamily: fonts.pixel, color: colors.ink },
  findCount: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  person: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: colors.line },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pinkTab, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.script, fontSize: 24, color: colors.pink },
  personName: { fontSize: 14, fontFamily: fonts.semibold, color: colors.ink },
  personMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  points: { backgroundColor: colors.butter, borderWidth: 1.5, borderColor: colors.ink2, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  pointsNum: { fontSize: 30, fontFamily: fonts.pixel, color: colors.pink },
  pointsText: { fontFamily: fonts.regular, fontSize: 13, color: colors.lavenderInk, marginTop: 2 },
  card: { flex: 1, maxWidth: "50%", backgroundColor: colors.card, borderRadius: 20, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.line },
  thumb: { backgroundColor: colors.lavender, borderRadius: 16, alignItems: "center", paddingVertical: 8 },
  creator: { fontSize: 15, fontFamily: fonts.pixel, color: colors.pink, marginTop: 6 },
  name: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] },
  reactions: { flexDirection: "row", gap: 6, marginVertical: 4 },
  react: { minHeight: 34, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.line, justifyContent: "center" },
  reactOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  reactText: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, fontVariant: ["tabular-nums"] },
});
