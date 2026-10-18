// Community: two-column feed of outfits people built. Like or dislike, "Try this look"
// loads it into the Studio. Posting your own outfits earns creator points (concept only).
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import BodySim from "../components/BodySim";
import { Button, Header, screen } from "../components/ui";
import { outfitTotal, useApp } from "../store";
import { colors, money, fonts } from "../theme";

export default function CommunityScreen({ onBag, onOpenStudio }) {
  const { state, actions } = useApp();
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);

  return (
    <FlatList
      data={state.community}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={screen.page}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Header title="The" emphasis="community" subtitle="Outfits built by Tillie users" bagCount={bagCount} onBag={onBag} />
          <View style={st.points}>
            <View style={{ flex: 1 }}>
              <Text style={st.pointsNum}>{state.points} creator points</Text>
              <Text style={st.pointsText}>Earn points by posting outfits from Saved and helping friends decide.</Text>
            </View>
          </View>
          <Text style={screen.sample}>Concept feature: points and creator commission are not real earnings.</Text>
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
  );
}

const st = StyleSheet.create({
  points: { backgroundColor: colors.lavender, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  pointsNum: { fontSize: 18, fontFamily: fonts.bold, color: colors.lavenderInk },
  pointsText: { fontFamily: fonts.regular, fontSize: 13, color: colors.lavenderInk, marginTop: 2 },
  card: { flex: 1, maxWidth: "50%", backgroundColor: colors.card, borderRadius: 20, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.line },
  thumb: { backgroundColor: colors.lavender, borderRadius: 16, alignItems: "center", paddingVertical: 8 },
  creator: { fontSize: 12, fontFamily: fonts.bold, color: colors.accent, marginTop: 6 },
  name: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] },
  reactions: { flexDirection: "row", gap: 6, marginVertical: 4 },
  react: { minHeight: 34, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.line, justifyContent: "center" },
  reactOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  reactText: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, fontVariant: ["tabular-nums"] },
});
