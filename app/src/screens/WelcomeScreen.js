// Welcome: soft blue art panel with the mannequin, the Tillie wordmark and tagline.
import { ScrollView, StyleSheet, Text, View } from "react-native";
import BodySim from "../components/BodySim";
import { Button, TillieOrb, Title, Wordmark } from "../components/ui";
import { useApp } from "../store";
import { SAMPLE_SAVED } from "../data/seed";
import { TOP_INSET, colors, fonts } from "../theme";

export default function WelcomeScreen() {
  const { actions } = useApp();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={st.art}>
        <View style={st.ring} />
        <Text style={st.scribble}>your closet,{"\n"}<Text style={st.scribbleEm}>remixed</Text></Text>
        <View style={{ marginTop: 26 }}>
          <BodySim outfit={SAMPLE_SAVED[0].items} scale={1.05} />
        </View>
        <View style={[st.orbit, { left: 16, top: "46%", transform: [{ rotate: "-4deg" }] }]}>
          <Text style={st.orbitText}><Text style={st.orbitStrong}>3 stores</Text> compared</Text>
        </View>
        <View style={[st.orbit, { right: 14, top: "26%", transform: [{ rotate: "5deg" }] }]}>
          <Text style={st.orbitText}><Text style={st.orbitStrong}>$34.99</Text> best price</Text>
        </View>
        <View style={[st.orbit, { right: 26, bottom: 26, transform: [{ rotate: "-2deg" }] }]}>
          <Text style={st.orbitText}><Text style={st.orbitStrong}>Shuffle</Text> your look</Text>
        </View>
        <View style={{ position: "absolute", left: 22, bottom: 24 }}>
          <TillieOrb size={46} />
        </View>
      </View>

      <View style={st.copy}>
        <Wordmark size={32} />
        <Title size={38} emphasis="Make it yours." style={{ textAlign: "center" }}>See it. Style it.</Title>
        <Text style={st.body}>
          Spot an outfit in a video or screenshot. Tillie finds similar pieces across stores in your budget, then lets you mix them on your own avatar before you buy.
        </Text>
        <Button title="Get started" onPress={actions.startFresh} style={{ alignSelf: "stretch" }} />
        <Button title="Explore with a sample profile" variant="ghost" onPress={actions.startSample} />
        <Text style={st.note}>Prototype · product listings and prices are sample data</Text>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  art: { minHeight: 470, backgroundColor: colors.soft2, borderBottomLeftRadius: 46, borderBottomRightRadius: 46, alignItems: "center", justifyContent: "center", overflow: "hidden", paddingTop: TOP_INSET },
  ring: { position: "absolute", top: TOP_INSET + 20, width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: "#AEB9CA" },
  scribble: { position: "absolute", top: TOP_INSET + 4, left: 20, fontSize: 13, fontFamily: fonts.medium, color: colors.ink, transform: [{ rotate: "-5deg" }], lineHeight: 16 },
  scribbleEm: { fontFamily: fonts.serifItalic, fontSize: 19 },
  orbit: { position: "absolute", backgroundColor: colors.card, borderWidth: 1, borderColor: "#9FA8B6", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, shadowColor: colors.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 4 }, elevation: 3 },
  orbitText: { fontSize: 11, fontFamily: fonts.medium, color: colors.ink },
  orbitStrong: { fontFamily: fonts.bold },
  copy: { paddingHorizontal: 24, paddingTop: 28, gap: 16, alignItems: "center" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center", fontFamily: fonts.regular },
  note: { color: colors.muted, fontSize: 11, fontFamily: fonts.regular },
});
