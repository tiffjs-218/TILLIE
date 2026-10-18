// Tillie: main file. Loads fonts, wraps the app in the shared data store and draws the
// floating bottom navigation: Discover, Studio, Saved, Community, Profile.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { PlayfairDisplay_600SemiBold_Italic } from "@expo-google-fonts/playfair-display/600SemiBold_Italic";
import { PlayfairDisplay_700Bold_Italic } from "@expo-google-fonts/playfair-display/700Bold_Italic";
import { AppProvider, useApp } from "./src/store";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import DiscoverScreen from "./src/screens/DiscoverScreen";
import StudioScreen from "./src/screens/StudioScreen";
import SavedScreen from "./src/screens/SavedScreen";
import CommunityScreen from "./src/screens/CommunityScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BagSheet from "./src/components/BagSheet";
import Icon from "./src/components/Icon";
import { Toast } from "./src/components/ui";
import { colors, fonts } from "./src/theme";

const TABS = [
  { key: "discover", label: "Discover" },
  { key: "studio", label: "Studio" },
  { key: "saved", label: "Saved" },
  { key: "community", label: "Community" },
  { key: "profile", label: "Profile" },
];

export default function App() {
  const [loaded, error] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
    PlayfairDisplay_600SemiBold_Italic, PlayfairDisplay_700Bold_Italic,
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

  if (!state.onboarded) return <WelcomeScreen />;

  const nav = {
    onBag: () => setBagOpen(true),
    onOpenStudio: () => setTab("studio"),
    onDiscover: () => setTab("discover"),
  };
  const dark = tab === "discover";

  return (
    <View style={st.app}>
      <View style={{ flex: 1 }}>
        {tab === "discover" && <DiscoverScreen {...nav} />}
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

      <BagSheet visible={bagOpen} onClose={() => setBagOpen(false)} />
      {!bagOpen && <Toast message={toast} />}
    </View>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  navWrap: { position: "absolute", left: 0, right: 0, bottom: 26, alignItems: "center" },
  nav: { flexDirection: "row", alignItems: "center", gap: 4, padding: 6, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: colors.line, shadowColor: "#111318", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  navDark: { backgroundColor: "rgba(17,19,24,0.72)", borderColor: "rgba(255,255,255,0.12)" },
  tab: { minWidth: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 12 },
  tabOn: { backgroundColor: colors.ink, paddingHorizontal: 16 },
  tabText: { color: "#FFFFFF", fontSize: 13, fontFamily: fonts.semibold },
});
