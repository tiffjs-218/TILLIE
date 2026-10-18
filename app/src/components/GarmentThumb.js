// Draws a little clothing illustration (shirt, jeans, sneaker, bag...) in the item's color.
// Used everywhere a product appears so the demo looks like real listings, not color squares.
import { Image, View, StyleSheet } from "react-native";
import { PHOTOS } from "../data/photos";
import { colors } from "../theme";

export default function GarmentThumb({ category, name = "", color = "#ccc", size = 56, background = colors.bg, radius }) {
  const photo = PHOTOS[name];
  if (photo && String(color).toLowerCase() === photo.color) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.22, backgroundColor: "#FFFFFF", overflow: "hidden", borderWidth: 1, borderColor: colors.line }}>
        <Image source={photo.src} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel={name} />
      </View>
    );
  }
  const n = name.toLowerCase();
  const s = size / 100; // draw on a 100×100 grid, then scale
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.22, backgroundColor: background, overflow: "hidden", borderWidth: 1, borderColor: colors.line }}>
      <View style={{ width: 100, height: 100, transform: [{ scale: s }], transformOrigin: "top left" }}>
        {draw(category, n, color)}
      </View>
    </View>
  );
}

const B = (style) => <View style={[st.part, style]} />;

function draw(cat, n, c) {
  if (cat === "top" || cat === "outerwear") {
    const short = /tee|tank|cami/.test(n) && !/long sleeve/.test(n);
    const cropped = /crop/.test(n);
    const vest = /vest/.test(n);
    const long = /blazer|coat|longline/.test(n);
    const h = cropped ? 40 : long ? 62 : 52;
    const sleeveH = short ? 22 : 50;
    const open = cat === "outerwear";
    return (
      <>
        {!vest && B({ left: 13, top: 24, width: 16, height: sleeveH, backgroundColor: c, borderRadius: 7, transform: [{ rotate: "14deg" }] })}
        {!vest && B({ left: 71, top: 24, width: 16, height: sleeveH, backgroundColor: c, borderRadius: 7, transform: [{ rotate: "-14deg" }] })}
        {B({ left: 26, top: 20, width: 48, height: h, backgroundColor: c, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 })}
        {/* neckline */}
        <View style={[st.neck, { borderColor: shade(c) }]} />
        {open && <View style={{ position: "absolute", left: 49.5, top: 26, width: 1.5, height: h - 6, backgroundColor: shade(c) }} />}
        {open && /blazer/.test(n) && (
          <>
            <View style={{ position: "absolute", left: 40, top: 24, width: 8, height: 18, backgroundColor: shade(c), transform: [{ rotate: "-20deg" }], opacity: 0.5 }} />
            <View style={{ position: "absolute", left: 52, top: 24, width: 8, height: 18, backgroundColor: shade(c), transform: [{ rotate: "20deg" }], opacity: 0.5 }} />
          </>
        )}
        {/knit|cable|sweater/.test(n) && <View style={{ position: "absolute", left: 26, top: 16 + h, width: 48, height: 5, backgroundColor: shade(c), opacity: 0.35, borderRadius: 2 }} />}
        {/stripe/.test(n) && [0, 1, 2, 3].map((i) => <View key={i} style={{ position: "absolute", left: 27, top: 32 + i * 10, width: 46, height: 3, backgroundColor: "#FFFFFF", opacity: 0.7 }} />)}
      </>
    );
  }
  if (cat === "bottom") {
    if (/skirt/.test(n)) {
      const maxi = /maxi/.test(n);
      const h = maxi ? 66 : 38;
      return (
        <>
          {B({ left: 32, top: 18, width: 36, height: 8, backgroundColor: shade(c), borderRadius: 2 })}
          {B({ left: 30, top: 25, width: 40, height: h * 0.5, backgroundColor: c })}
          {B({ left: 24, top: 25 + h * 0.45, width: 52, height: h * 0.55, backgroundColor: c, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 })}
          {/pleat/.test(n) && [0, 1, 2, 3].map((i) => <View key={i} style={{ position: "absolute", left: 34 + i * 10, top: 30, width: 1.5, height: h - 6, backgroundColor: shade(c), opacity: 0.5 }} />)}
        </>
      );
    }
    const wide = /wide|baggy/.test(n);
    const lw = wide ? 22 : 18;
    return (
      <>
        {B({ left: 28, top: 12, width: 44, height: 8, backgroundColor: shade(c), borderRadius: 2 })}
        {B({ left: 28, top: 19, width: 44, height: 16, backgroundColor: c })}
        {B({ left: 50 - lw - 1, top: 30, width: lw, height: 60, backgroundColor: c, borderBottomLeftRadius: 3, transform: [{ rotate: wide ? "4deg" : "2deg" }] })}
        {B({ left: 51, top: 30, width: lw, height: 60, backgroundColor: c, borderBottomRightRadius: 3, transform: [{ rotate: wide ? "-4deg" : "-2deg" }] })}
      </>
    );
  }
  if (cat === "shoes") {
    if (/boot/.test(n)) {
      return (
        <>
          {B({ left: 34, top: 10, width: 22, height: 64, backgroundColor: c, borderTopLeftRadius: 4, borderTopRightRadius: 4 })}
          {B({ left: 34, top: 62, width: 42, height: 16, backgroundColor: c, borderTopRightRadius: 14, borderBottomRightRadius: 6 })}
          {B({ left: 34, top: 76, width: 44, height: 6, backgroundColor: shade(c), borderRadius: 2 })}
          {B({ left: 34, top: 76, width: 8, height: 12, backgroundColor: shade(c) })}
        </>
      );
    }
    const flat = /flat|loafer|mule|clog/.test(n);
    return (
      <>
        {B({ left: 14, top: flat ? 46 : 38, width: 70, height: flat ? 20 : 28, backgroundColor: c, borderTopLeftRadius: 14, borderTopRightRadius: 26, borderBottomRightRadius: 8 })}
        {B({ left: 12, top: 64, width: 76, height: 9, backgroundColor: /gum/.test(n) ? "#C08A4A" : shade(c, 0.12), borderRadius: 4 })}
        {!flat && [0, 1, 2].map((i) => <View key={i} style={{ position: "absolute", left: 44 + i * 7, top: 42 + i * 2, width: 9, height: 2, backgroundColor: shade(c, 0.35) }} />)}
        {/loafer/.test(n) && B({ left: 52, top: 48, width: 16, height: 5, backgroundColor: shade(c), borderRadius: 2 })}
      </>
    );
  }
  // accessories
  if (/hoop|earring/.test(n)) {
    return (
      <>
        <View style={[st.hoop, { left: 22, borderColor: c }]} />
        <View style={[st.hoop, { left: 54, borderColor: c }]} />
      </>
    );
  }
  if (/necklace|chain/.test(n)) {
    return (
      <>
        <View style={{ position: "absolute", left: 22, top: 18, width: 56, height: 52, borderRadius: 28, borderWidth: 3, borderTopWidth: 0, borderColor: c }} />
        <View style={{ position: "absolute", left: 46, top: 66, width: 8, height: 10, borderRadius: 4, backgroundColor: c }} />
      </>
    );
  }
  const tote = /tote/.test(n);
  return (
    <>
      <View style={{ position: "absolute", left: tote ? 30 : 32, top: tote ? 14 : 18, width: tote ? 40 : 36, height: 30, borderRadius: 18, borderWidth: 4, borderBottomWidth: 0, borderColor: shade(c) }} />
      {B({ left: tote ? 18 : 22, top: tote ? 34 : 38, width: tote ? 64 : 56, height: tote ? 48 : 36, backgroundColor: c, borderRadius: 8 })}
      {tote && [0, 1, 2, 3].map((i) => <View key={i} style={{ position: "absolute", left: 20, top: 40 + i * 10, width: 60, height: 1.5, backgroundColor: shade(c), opacity: 0.5 }} />)}
      {!tote && B({ left: 46, top: 44, width: 8, height: 6, backgroundColor: "#D4AF37", borderRadius: 2, borderWidth: 0 })}
    </>
  );
}

// a slightly darker version of a hex color, for seams and soles
function shade(hex, amount = 0.22) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  const d = v.map((x) => Math.max(0, Math.round(x * (1 - amount))));
  return `rgb(${d[0]},${d[1]},${d[2]})`;
}

const st = StyleSheet.create({
  part: { position: "absolute", borderWidth: 1, borderColor: "rgba(37,35,41,0.16)" },
  neck: { position: "absolute", left: 41, top: 18, width: 18, height: 10, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderWidth: 2, borderTopWidth: 0, backgroundColor: "transparent" },
  hoop: { position: "absolute", top: 26, width: 24, height: 30, borderRadius: 14, borderWidth: 5 },
});
