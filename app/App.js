// Tillie: main file. Loads fonts, wraps the app in the shared data store and draws the
// floating bottom navigation: Discover, Studio, Saved, Community, Profile.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Raleway_400Regular } from "@expo-google-fonts/raleway/400Regular";
import { Raleway_500Medium } from "@expo-google-fonts/raleway/500Medium";
import { Raleway_600SemiBold } from "@expo-google-fonts/raleway/600SemiBold";
import { Raleway_700Bold } from "@expo-google-fonts/raleway/700Bold";
import { VT323_400Regular } from "@expo-google-fonts/vt323/400Regular";
import { PinyonScript_400Regular } from "@expo-google-fonts/pinyon-script/400Regular";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { AppProvider, useApp } from "./src/store";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import DiscoverScreen from "./src/screens/DiscoverScreen";
import StudioScreen from "./src/screens/StudioScreen";
import ClosetScreen from "./src/screens/ClosetScreen";
import SavedScreen from "./src/screens/SavedScreen";
import CommunityScreen from "./src/screens/CommunityScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BagSheet from "./src/components/BagSheet";
import Icon from "./src/components/Icon";
import { Toast } from "./src/components/ui";
import { colors, fonts } from "./src/theme";

const TABS = [
  { key: "discover", label: "Discover" },
  { key: "closet", label: "Closet" },
  { key: "studio", label: "Studio" },
  { key: "saved", label: "Saved" },
  { key: "community", label: "Community" },
  { key: "profile", label: "Profile" },
];

export default function App() {
  const [loaded, error] = useFonts({
    Raleway_400Regular, Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold,
    VT323_400Regular, PinyonScript_400Regular,
  });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { state, toast } = useApp();
  const [tab, setTab] = useState("discover");
  const [bagOpen, setBagOpen] = useState(false);
  const [bagTab, setBagTab] = useState("bag");

  if (!state.onboarded) return <WelcomeScreen />;

  const nav = {
    onBag: () => { setBagTab("bag"); setBagOpen(true); },
    onOrders: () => { setBagTab("orders"); setBagOpen(true); },
    onOpenStudio: () => setTab("studio"),
    onOpenCloset: () => setTab("closet"),
    onDiscover: () => setTab("discover"),
  };
  const dark = tab === "discover";

  return (
    <View style={st.app}>
      <Backdrop />
      <View style={{ flex: 1 }}>
        {tab === "discover" && <DiscoverScreen {...nav} />}
        {tab === "closet" && <ClosetScreen {...nav} />}
        {tab === "studio" && <StudioScreen {...nav} />}
        {tab === "saved" && <SavedScreen {...nav} />}
        {tab === "community" && <CommunityScreen {...nav} />}
        {tab === "profile" && <ProfileScreen {...nav} />}
      </View>

      {/* floating pill navigation */}
      <View style={[st.navWrap]} pointerEvents="box-none">
        <View style={[st.nav, dark && st.navDark]} accessibilityRole="tablist">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityLabel={t.label}
                accessibilityState={{ selected: on }} style={[st.tab, on && st.tabOn]}>
                <Icon name={t.key} size={20} color={on ? "#FFFFFF" : dark ? "rgba(255,255,255,0.75)" : colors.muted} />
                {on && <Text style={st.tabText} numberOfLines={1}>{t.label}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      <BagSheet visible={bagOpen} initialTab={bagTab} onClose={() => setBagOpen(false)} />
      {!bagOpen && <Toast message={toast} />}
    </View>
  );
}

// Soft pink → periwinkle gradient with halftone dots in the corners (from the Canva template)
function Backdrop() {
  const dots = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = Math.hypot(r, c);
      if (d < 9) dots.push({ x: 400 - c * 14, y: r * 14, r: Math.max(0.6, 5 - d * 0.55) });
    }
  }
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
      <Defs>
        <LinearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FCEFF3" />
          <Stop offset="0.5" stopColor={colors.bg} />
          <Stop offset="1" stopColor={colors.bg2} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="860" fill="url(#bgg)" />
      {dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={colors.soft2} opacity={0.7} />)}
      {dots.map((d, i) => <Circle key={`b${i}`} cx={400 - d.x} cy={860 - d.y} r={d.r} fill={colors.soft2} opacity={0.55} />)}
    </Svg>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  navWrap: { position: "absolute", left: 0, right: 0, bottom: 26, alignItems: "center" },
  nav: { flexDirection: "row", alignItems: "center", gap: 2, padding: 5, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: colors.line, shadowColor: "#111318", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  navDark: { backgroundColor: "rgba(17,19,24,0.72)", borderColor: "rgba(255,255,255,0.12)" },
  tab: { minWidth: 44, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 10 },
  tabOn: { backgroundColor: colors.pink, paddingHorizontal: 14 },
  tabText: { color: "#FFFFFF", fontSize: 17, fontFamily: fonts.pixel },
});
