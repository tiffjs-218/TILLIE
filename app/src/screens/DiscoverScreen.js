// Discover: a fake TikTok-style feed you swipe through. The translucent yellow Tillie "T"
// floats on the screen like an extension. Tap it, then "Scan" to open the 3/4 shopping sheet.
// Detection on feed posts is simulated. The camera button uses real Gemini on your own screenshot.
import { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import BodySim from "../components/BodySim";
import ShopSheet from "../components/ShopSheet";
import Icon from "../components/Icon";
import { TillieOrb } from "../components/ui";
import { detectClothes } from "../api";
import { useApp } from "../store";
import { FEED } from "../data/seed";
import { TOP_INSET, colors, fonts } from "../theme";

export default function DiscoverScreen({ onBag, onOpenCloset }) {
  const { state, actions } = useApp();
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);
  const [job, setJob] = useState(null);
  const [open, setOpen] = useState(false);
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);

  function shopVideo(video) {
    const key = `${video.id}-${Date.now()}`;
    setJob({ key, status: "loading", simulated: true });
    setOpen(true);
    setTimeout(() => {
      setJob({ key, status: "done", simulated: true, items: video.detected });
      actions.addRecent(video.detected);
    }, 1100);
  }

  async function uploadScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.5 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const key = Date.now();
    setJob({ key, status: "loading", imageUri: asset.uri });
    setOpen(true);
    try {
      const res = await detectClothes(asset.base64, asset.mimeType || "image/jpeg");
      setJob({ key, status: "done", imageUri: asset.uri, ...res });
      if (res.items?.length) actions.addRecent(res.items);
    } catch (err) {
      setJob({ key, status: "error", imageUri: asset.uri, error: err.message });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#111" }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      {height > 0 && (
        <FlatList
          data={FEED}
          keyExtractor={(v) => v.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.y / height))}
          renderItem={({ item }) => <VideoPage video={item} height={height} />}
        />
      )}

      {/* top bar: screenshot upload + feed tabs + bag */}
      <View style={st.topBar} pointerEvents="box-none">
        <Pressable onPress={uploadScreenshot} style={st.roundBtn} accessibilityRole="button" accessibilityLabel="Upload a screenshot to find its clothes">
          <Icon name="camera" size={21} color="#FFFFFF" />
        </Pressable>
        <View style={st.feedTabs} importantForAccessibility="no-hide-descendants">
          <Text style={st.feedTab}>Following</Text>
          <View>
            <Text style={[st.feedTab, st.feedTabOn]}>For You</Text>
            <View style={st.feedTabLine} />
          </View>
        </View>
        <Pressable onPress={onBag} style={st.roundBtn} accessibilityRole="button" accessibilityLabel={`Shopping bag, ${bagCount} items`}>
          <Icon name="bag" size={21} color="#FFFFFF" />
          {bagCount > 0 && (
            <View style={st.badge}>
              <Text style={st.badgeText}>{bagCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {height > 0 && <Companion top={height * 0.5} onScan={() => shopVideo(FEED[index] || FEED[0])} />}

      <ShopSheet visible={open} job={job} onClose={() => setOpen(false)} onOpenStudio={onOpenCloset} />
    </View>
  );
}

function VideoPage({ video, height }) {
  return (
    <View style={{ height, backgroundColor: video.bg[0], overflow: "hidden" }}>
      {video.image ? (
        <>
          <Image source={video.image} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Outfit post by ${video.creator}`} />
          <View style={st.shadeTop} />
          <View style={st.shadeBottom} />
        </>
      ) : (
        <>
          <View style={[st.blob, { backgroundColor: video.bg[1], top: height * 0.12, left: -80 }]} />
          <View style={[st.blob, { backgroundColor: video.bg[1], opacity: 0.5, top: height * 0.55, right: -120, width: 320, height: 320 }]} />
          <View style={[st.person, { top: Math.max(TOP_INSET + 40, height * 0.1) }]}>
            <BodySim outfit={video.outfit} scale={Math.min(1.45, (height * 0.62) / 420)} />
          </View>
          <View style={st.shadeBottom} />
        </>
      )}

      <View style={st.sampleTag}>
        <Text style={st.sampleTagText}>Sample feed</Text>
      </View>

      <View style={st.rail} importantForAccessibility="no-hide-descendants">
        <View style={st.creatorDot}>
          <Text style={st.creatorInitial}>{video.creator[1].toUpperCase()}</Text>
        </View>
        <RailItem icon="heart" label={video.likes} />
        <RailItem icon="community" label={video.comments} />
        <RailItem icon="saved" label={video.saves} />
        <RailItem icon="next" label={video.shares} />
      </View>

      <View style={st.captionBox}>
        <Text style={st.creator}>{video.creator}</Text>
        <Text style={st.caption}>{video.caption}</Text>
        <Text style={st.sound} numberOfLines={1}>♪ {video.sound}</Text>
      </View>
    </View>
  );
}

function RailItem({ icon, label }) {
  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      <Icon name={icon} size={28} color="#FFFFFF" strokeWidth={2} />
      <Text style={st.railLabel}>{label}</Text>
    </View>
  );
}

// The floating Tillie companion: translucent "T". Tap to expand, then Scan.
function Companion({ top, onScan }) {
  const [expanded, setExpanded] = useState(false);
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 900, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <Animated.View style={[st.companion, { top, transform: [{ translateY: bob }] }, expanded && st.companionOpen]}>
      {expanded && (
        <>
          <View style={{ marginLeft: 6 }}>
            <Text style={st.compTitle}>Shop this look?</Text>
            <Text style={st.compSub}>Sample feed · simulated scan</Text>
          </View>
          <Pressable onPress={() => { setExpanded(false); onScan(); }} style={st.scanBtn} accessibilityRole="button" accessibilityLabel="Scan this look">
            <Icon name="sparkle" size={16} color={colors.ink} />
            <Text style={st.scanText}>Scan</Text>
          </Pressable>
        </>
      )}
      <TillieOrb size={52} onPress={() => setExpanded((v) => !v)} label={expanded ? "Close Tillie" : "Open Tillie"} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  blob: { position: "absolute", width: 360, height: 360, borderRadius: 180, opacity: 0.8 },
  person: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  shadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 140, backgroundColor: "rgba(0,0,0,0.22)" },
  shadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 240, backgroundColor: "rgba(0,0,0,0.32)" },
  sampleTag: { position: "absolute", top: TOP_INSET + 52, left: 16, backgroundColor: "rgba(37,35,41,0.6)", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  sampleTagText: { color: "#FFFFFF", fontSize: 15, fontFamily: fonts.pixel },
  rail: { position: "absolute", right: 12, bottom: 230, alignItems: "center", gap: 16 },
  creatorDot: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.pinkTab, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  creatorInitial: { color: colors.pink, fontFamily: fonts.script, fontSize: 26 },
  railLabel: { color: "#FFFFFF", fontSize: 12, fontFamily: fonts.semibold },
  captionBox: { position: "absolute", left: 16, right: 84, bottom: 110, gap: 3 },
  creator: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 16 },
  caption: { color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  sound: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: fonts.regular },
  companion: { position: "absolute", right: 14, flexDirection: "row", alignItems: "center", gap: 10, padding: 4, borderRadius: 32 },
  companionOpen: { backgroundColor: colors.pink, paddingLeft: 14, shadowColor: "#111318", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  compTitle: { color: "#FFFFFF", fontFamily: fonts.pixel, fontSize: 18 },
  compSub: { color: "#FBE3F4", fontFamily: fonts.regular, fontSize: 10 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.butter, borderRadius: 20, paddingHorizontal: 14, minHeight: 40 },
  scanText: { color: colors.ink, fontFamily: fonts.pixel, fontSize: 19 },
  topBar: { position: "absolute", top: TOP_INSET - 6, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(37,35,41,0.55)", alignItems: "center", justifyContent: "center" },
  feedTabs: { flexDirection: "row", gap: 18, alignItems: "flex-start" },
  feedTab: { color: "rgba(255,255,255,0.7)", fontSize: 21, fontFamily: fonts.pixel },
  feedTabOn: { color: "#FFFFFF" },
  feedTabLine: { alignSelf: "center", width: 26, height: 3, borderRadius: 2, backgroundColor: colors.pink, marginTop: 2 },
  badge: { position: "absolute", top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: fonts.bold },
});
