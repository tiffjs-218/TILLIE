// Profile: name, size, style, budget, address and body measurements (cm/in).
// Everything saves on the phone automatically. Measurements only shape the avatar.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import BodySim from "../components/BodySim";
import { Button, Header, Pill, screen } from "../components/ui";
import { useApp } from "../store";
import { colors, fonts } from "../theme";

const SIZES = ["XS", "S", "M", "L", "XL"];
const STYLES = ["Casual", "Streetwear", "Minimal", "Y2K", "Preppy", "Vintage", "Athleisure", "Formal"];
const BUDGETS = [["25", "Under $25"], ["50", "Under $50"], ["100", "Under $100"], ["any", "No limit"]];
const MEASURES = [["height", "Height"], ["waist", "Waist"], ["arm", "Arm length"], ["torso", "Torso length"]];

function Field({ id, label, value, onChange, placeholder, numeric }) {
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 120 }}>
      <Text style={screen.label} nativeID={id}>{label}</Text>
      <TextInput accessibilityLabelledBy={id} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.muted} keyboardType={numeric ? "decimal-pad" : "default"} style={screen.input} />
    </View>
  );
}

export default function ProfileScreen({ onBag }) {
  const { state, actions } = useApp();
  const p = state.profile;
  const set = (key) => (val) => actions.setProfile({ [key]: val });
  const bagCount = state.bag.reduce((n, b) => n + b.qty, 0);

  // Switching units converts the numbers already typed in
  function setUnit(unit) {
    if (unit === p.unit) return;
    const f = unit === "cm" ? 2.54 : 1 / 2.54;
    const patch = { unit };
    MEASURES.forEach(([k]) => {
      const n = parseFloat(p[k]);
      if (n) patch[k] = String(Math.round(n * f * 10) / 10);
    });
    actions.setProfile(patch);
  }

  const toggleStyle = (s) => actions.setProfile({ styles: p.styles.includes(s) ? p.styles.filter((x) => x !== s) : [...p.styles, s] });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={screen.page} keyboardShouldPersistTaps="handled">
        <Header title="Your" emphasis="profile" subtitle="Saved on this phone" bagCount={bagCount} onBag={onBag} />

        <Field id="name" label="Name" value={p.name} onChange={set("name")} placeholder="Your name" />

        <Text style={screen.section}>Preferred size</Text>
        <View style={st.wrap}>{SIZES.map((s) => <Pill key={s} label={s} selected={p.size === s} onPress={() => actions.setProfile({ size: s })} />)}</View>

        <Text style={screen.section}>Style preferences</Text>
        <View style={st.wrap}>{STYLES.map((s) => <Pill key={s} label={s} selected={p.styles.includes(s)} onPress={() => toggleStyle(s)} />)}</View>

        <Text style={screen.section}>Budget per piece</Text>
        <View style={st.wrap}>{BUDGETS.map(([k, label]) => <Pill key={k} label={label} selected={p.budget === k} onPress={() => actions.setProfile({ budget: k })} />)}</View>

        <View style={st.sectionRow}>
          <Text style={screen.section}>Measurements</Text>
          <View style={st.wrap}>
            <Pill label="in" selected={p.unit === "in"} onPress={() => setUnit("in")} />
            <Pill label="cm" selected={p.unit === "cm"} onPress={() => setUnit("cm")} />
          </View>
        </View>
        <View style={st.measure}>
          <View style={{ flex: 1, gap: 10 }}>
            {MEASURES.map(([k, label]) => (
              <Field key={k} id={k} label={`${label} (${p.unit})`} value={p[k]} onChange={set(k)} numeric placeholder="0" />
            ))}
          </View>
          <View style={st.preview}>
            <BodySim profile={p} outfit={state.outfit} layerOrder={state.layerOrder} scale={0.55} />
          </View>
        </View>
        <Text style={screen.sample}>Measurements personalize the illustrative avatar. They don't guarantee how a garment will fit.</Text>

        <Text style={screen.section}>Delivery address</Text>
        <Field id="street" label="Street" value={p.street} onChange={set("street")} placeholder="4000 15th Ave NE" />
        <View style={st.wrap}>
          <Field id="city" label="City" value={p.city} onChange={set("city")} placeholder="Seattle, WA" />
          <Field id="zip" label="ZIP" value={p.zip} onChange={set("zip")} placeholder="98105" numeric />
        </View>

        <Text style={screen.section}>Payment</Text>
        <Text style={screen.muted}>Each retailer handles payment at checkout. Tillie never collects or stores card details.</Text>

        <Button title="Reset demo data" variant="ghost" onPress={actions.resetAll} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  measure: { flexDirection: "row", gap: 12, alignItems: "center" },
  preview: { backgroundColor: colors.lavender, borderRadius: 20, padding: 10 },
});
