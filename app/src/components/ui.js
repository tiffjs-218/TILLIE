// Shared UI in Tillie's style (from the Figma Make file): black buttons with a yellow
// underline shadow, outline pills, silver-blue panels, DM Sans + Playfair italic accents.
import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { TOP_INSET, colors, fonts } from "../theme";
import { useApp } from "../store";
import Icon from "./Icon";

export function Button({ title, onPress, variant = "primary", disabled, style, small, icon }) {
  if (variant === "primary") {
    // black button sitting on a yellow "shadow"
    return (
      <View style={[s.primaryWrap, small && s.primaryWrapSmall, disabled && { opacity: 0.4 }, style]}>
        <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
          style={({ pressed }) => [s.btn, small && s.btnSmall, s.primary, pressed && { transform: [{ translateY: 3 }] }]}>
          {icon ? <Icon name={icon} size={18} color="#FFFFFF" /> : null}
          <Text style={[s.btnText, small && s.btnTextSmall, { color: "#FFFFFF" }]}>{title}</Text>
        </Pressable>
      </View>
    );
  }
  const v = variant === "lavender" || variant === "soft" ? s.soft : variant === "yellow" ? s.yellow : variant === "ghost" ? s.ghost : s.outline;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, small && s.btnSmall, v, disabled && { opacity: 0.4 }, pressed && { opacity: 0.7 }, style]}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <Text style={[s.btnText, small && s.btnTextSmall, variant === "ghost" && s.ghostText]}>{title}</Text>
    </Pressable>
  );
}

export function Swatch({ color, size = 44, radius = 12 }) {
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, borderWidth: 1, borderColor: "rgba(17,19,24,0.12)" }} />;
}

export function ColorDot({ color, selected, onPress, label, size = 22 }) {
  const dot = <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 2, borderColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 1, shadowOffset: { width: 0, height: 0 } }} />;
  if (!onPress) return dot;
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} hitSlop={6}
      style={[s.dotRing, selected && { borderColor: colors.ink }]}>
      {dot}
    </Pressable>
  );
}

export function Pill({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[s.pill, selected && s.pillOn]}>
      <Text style={[s.pillText, selected && s.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, tone = "yellow" }) {
  return (
    <View style={[s.chip, tone === "soft" && { backgroundColor: colors.soft }, tone === "dark" && { backgroundColor: colors.ink }]}>
      <Text style={[s.chipText, tone === "dark" && { color: "#FFFFFF" }]}>{label}</Text>
    </View>
  );
}

export function Checkbox({ checked, onPress, label }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} hitSlop={10}
      style={[s.check, checked && s.checkOn]}>
      {checked && <Text style={s.checkMark}>✓</Text>}
    </Pressable>
  );
}

// Big editorial title: "Your *closet*" — the emphasized word is Playfair italic
export function Title({ children, emphasis, size = 40, style }) {
  return (
    <Text style={[s.title, { fontSize: size * 1.15, lineHeight: size * 1.25 }, style]}>
      {children}
      {emphasis ? <Text style={[s.titleEm, { fontSize: size * 1.25 }]}> {emphasis}</Text> : null}
    </Text>
  );
}

// four-point sparkle, like the template's stars
export function Sparkle({ size = 18, color = colors.pink, style }) {
  return <Text style={[{ fontSize: size, color, lineHeight: size * 1.1 }, style]} importantForAccessibility="no">✦</Text>;
}

// Retro computer window frame (title bar + _ □ ×), from the template
export function RetroWindow({ title, children, style, bar = "pink", bodyStyle }) {
  const barColor = bar === "blue" ? colors.soft2 : bar === "butter" ? colors.butter : "#F2B8E4";
  return (
    <View style={[s.win, style]}>
      <View style={[s.winBar, { backgroundColor: barColor }]}>
        <Text style={s.winTitle} numberOfLines={1}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {["_", "□", "×"].map((g) => (
            <View key={g} style={s.winBtn}><Text style={s.winBtnText}>{g}</Text></View>
          ))}
        </View>
      </View>
      <View style={[{ flex: 1 }, bodyStyle]}>{children}</View>
    </View>
  );
}

// The Tillie wordmark: italic "Tillie" + a yellow dot
export function Wordmark({ size = 26 }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={{ fontFamily: fonts.script, fontSize: size * 1.5, color: colors.pink, marginRight: -size * 0.12 }}>T</Text>
      <Text style={{ fontFamily: fonts.pixel, fontSize: size * 1.15, color: colors.pink, marginBottom: size * 0.05 }}>illie</Text>
      <Sparkle size={size * 0.5} color={colors.ink} style={{ marginLeft: 3, marginBottom: size * 0.7 }} />
    </View>
  );
}

// The round yellow "T" logo, slightly translucent
export function TillieOrb({ size = 52, onPress, label = "Open Tillie" }) {
  const body = (
    <View style={[s.orb, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.orbT, { fontSize: size * 0.48 }]}>T</Text>
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>{body}</Pressable>;
}

export function Sheet({ visible, onClose, title, children, height = "75%" }) {
  const toast = useApp()?.toast;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={[s.sheet, { height }]}>
          <View style={s.grabber} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle} numberOfLines={1}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={s.closeBtn}>
              <Icon name="close" size={18} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </View>
        <Toast message={toast} />
      </View>
    </Modal>
  );
}

// Screen header: wordmark (or a title) on the left, bag with count on the right
export function Header({ title, emphasis, subtitle, bagCount = 0, onBag }) {
  return (
    <View style={{ gap: 18 }}>
      <View style={s.header}>
        <Wordmark />
        <Pressable onPress={onBag} accessibilityRole="button" accessibilityLabel={`Shopping bag, ${bagCount} items`} hitSlop={10} style={s.bagBtn}>
          <Icon name="bag" size={20} />
          {bagCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{bagCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
      {title ? (
        <View style={{ gap: 6 }}>
          <Title emphasis={emphasis}>{title}</Title>
          {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function Toast({ message }) {
  const y = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    if (!message) return;
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(y, { toValue: -120, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [message, y]);
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { transform: [{ translateY: y }] }]} accessibilityLiveRegion="polite">
      <View style={s.toastDot}><Text style={{ color: colors.yellow, fontFamily: fonts.bold }}>✓</Text></View>
      <Text style={s.toastText}>{message.text}</Text>
    </Animated.View>
  );
}

export const screen = StyleSheet.create({
  page: { paddingTop: TOP_INSET, paddingHorizontal: 20, paddingBottom: 120, gap: 18 },
  section: { fontSize: 20, fontFamily: fonts.pixel, color: colors.pink, letterSpacing: 0.5 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: colors.line },
  input: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, minHeight: 48, fontSize: 16, color: colors.ink, fontFamily: fonts.regular },
  label: { color: colors.ink, fontSize: 14, fontFamily: fonts.semibold },
  sample: { color: colors.muted, fontSize: 11, fontFamily: fonts.regular },
});

const s = StyleSheet.create({
  primaryWrap: { backgroundColor: colors.soft2, borderRadius: 16, paddingBottom: 5 },
  primaryWrapSmall: { borderRadius: 12, paddingBottom: 4 },
  btn: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnSmall: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14 },
  primary: { backgroundColor: colors.pink },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.ink },
  soft: { backgroundColor: colors.soft },
  yellow: { backgroundColor: colors.butter },
  ghost: { backgroundColor: "transparent" },
  btnText: { fontSize: 21, fontFamily: fonts.pixel, color: colors.ink, letterSpacing: 0.5 },
  btnTextSmall: { fontSize: 18 },
  ghostText: { textDecorationLine: "underline", fontFamily: fonts.semibold },
  dotRing: { padding: 2, borderRadius: 999, borderWidth: 2, borderColor: "transparent" },
  pill: { paddingHorizontal: 15, minHeight: 38, justifyContent: "center", borderRadius: 22, backgroundColor: "transparent", borderWidth: 1, borderColor: colors.chipLine },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { color: colors.ink, fontSize: 17, fontFamily: fonts.pixel },
  pillTextOn: { color: "#FFFFFF" },
  chip: { alignSelf: "flex-start", backgroundColor: colors.pinkTab, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { color: colors.pink, fontSize: 14, fontFamily: fonts.pixel },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.chipLine, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkMark: { color: colors.yellow, fontFamily: fonts.bold, fontSize: 15 },
  title: { fontFamily: fonts.pixel, color: colors.ink },
  titleEm: { fontFamily: fonts.script, color: colors.pink },
  orb: { backgroundColor: colors.yellowSoft, borderWidth: 3, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center", shadowColor: "#111318", shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  orbT: { fontFamily: fonts.script, color: colors.pink, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(37,35,41,0.5)" },
  sheet: { backgroundColor: colors.bg, borderTopWidth: 2, borderColor: colors.soft2, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingBottom: 28 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 4, backgroundColor: "#D3C8CB", marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
  sheetTitle: { fontSize: 30, fontFamily: fonts.pixel, color: colors.ink, flex: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerSub: { marginTop: -4, fontSize: 14, color: colors.muted, fontFamily: fonts.regular, lineHeight: 20 },
  bagBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -3, right: -2, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderWidth: 2, borderColor: colors.bg },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: fonts.bold },
  toast: { position: "absolute", alignSelf: "center", top: TOP_INSET, backgroundColor: colors.ink2, borderRadius: 30, paddingVertical: 8, paddingLeft: 8, paddingRight: 18, flexDirection: "row", alignItems: "center", gap: 10, maxWidth: "90%" },
  toastDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  toastText: { color: "#FFFFFF", fontSize: 13, fontFamily: fonts.semibold, flexShrink: 1 },
  win: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.ink2, borderRadius: 4, overflow: "hidden" },
  winBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, height: 26, borderBottomWidth: 1.5, borderBottomColor: colors.ink2 },
  winTitle: { fontFamily: fonts.pixel, fontSize: 17, color: colors.ink2, flex: 1 },
  winBtn: { width: 16, height: 16, borderWidth: 1.2, borderColor: colors.ink2, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  winBtnText: { fontFamily: fonts.pixel, fontSize: 13, color: colors.ink2, lineHeight: 14 },
});
