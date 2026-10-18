// The avatar: a smooth white mannequin (like a 3D fashion render), drawn with SVG.
// - Clothes are built from the body's own measurements, so they follow its shape.
// - Layers: inner (tees, shirts) → mid (sweaters) → outer (jackets), in the Studio's order.
// - `angle` turns the figure (0 = front, 180 = back) for a 360° preview.
// - Height, bust and waist from Profile reshape it. Illustrative only, not an exact fit.
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import { DEFAULT_ORDER, colors } from "../theme";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const VB_W = 200;
const VB_H = 420;
const CX = 100;

function inches(value, unit) {
  const n = parseFloat(value);
  if (!n) return null;
  return unit === "cm" ? n / 2.54 : n;
}

// torso half-width at each height (bust area scaled by `bf`)
const torsoTable = (bf) => [[66, 9], [72, 21], [80, 25 * bf], [98, 24 * bf], [118, 19.5], [140, 15], [158, 19], [176, 22.5], [196, 21.5]];
const LEG_C = [[186, 11], [240, 10], [290, 9.5], [370, 9]];
const LEG_W = [[186, 12.5], [236, 10.5], [282, 7.2], [322, 6.4], [366, 4.6]];

function lerp(table, y) {
  if (y <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [y1, v1] = table[i];
    const [y0, v0] = table[i - 1];
    if (y <= y1) return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
  }
  return table[table.length - 1][1];
}
const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function torsoShape(T, yTop, yBottom, loose = 0, flare = 0) {
  const left = [];
  const right = [];
  for (let y = yTop; y <= yBottom; y += 4) {
    const t = (y - yTop) / Math.max(1, yBottom - yTop);
    const w = lerp(T, Math.min(y, 196)) + loose + flare * t;
    left.push([CX - w, y]);
    right.unshift([CX + w, y]);
  }
  return pts([...left, ...right]);
}

function legShape(side, yTop, yBottom, loose = 0, flareTo = 0) {
  const outer = [];
  const inner = [];
  for (let y = yTop; y <= yBottom; y += 5) {
    const t = (y - yTop) / Math.max(1, yBottom - yTop);
    const c = CX + side * lerp(LEG_C, y);
    const w = Math.max(lerp(LEG_W, y) + loose, flareTo * t + (lerp(LEG_W, y) + loose) * (1 - t));
    outer.push([c + side * w, y]);
    inner.unshift([c - side * w, y]);
  }
  return pts([...outer, ...inner]);
}

const ARM = {
  L: { s: [77, 78], e: [61, 136], w: [47, 190] },
  R: { s: [123, 78], e: [139, 136], w: [153, 190] },
};
function armPath(a, part = 1) {
  if (part < 1) {
    const x = a.s[0] + (a.e[0] - a.s[0]) * part;
    const y = a.s[1] + (a.e[1] - a.s[1]) * part;
    return `M${a.s[0]},${a.s[1]} L${x},${y}`;
  }
  return `M${a.s[0]},${a.s[1]} L${a.e[0]},${a.e[1]} L${a.w[0]},${a.w[1]}`;
}

function shade(hex, amount = 0.18) {
  if (!hex || hex[0] !== "#") return hex;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  const d = v.map((x) => Math.max(0, Math.round(x * (1 - amount))));
  return `rgb(${d[0]},${d[1]},${d[2]})`;
}

// Map older outfits (keyed by category) onto layers
function normalize(outfit) {
  const o = { ...outfit };
  if (o.top && !o.inner && !o.mid) { o.inner = o.top; }
  if (o.outerwear && !o.outer) { o.outer = o.outerwear; }
  delete o.top;
  delete o.outerwear;
  return o;
}

export default function BodySim({ outfit = {}, profile = {}, layerOrder = DEFAULT_ORDER, scale = 1, backdrop = false, angle = 0 }) {
  const heightIn = inches(profile.height, profile.unit) || 65;
  const waistIn = inches(profile.waist, profile.unit) || 28;
  const bustIn = inches(profile.bust, profile.unit) || 34;
  const hs = clamp(heightIn / 65, 0.92, 1.08);
  const ws = clamp(waistIn / 28, 0.85, 1.25);
  const bf = clamp(bustIn / 34 / ws, 0.85, 1.2); // bust relative to the waist-scaled body

  const rad = (((angle % 360) + 360) % 360) * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const back = cos < 0;
  const sx = 0.4 + 0.6 * Math.abs(cos); // narrower when seen from the side

  const ctx = { T: torsoTable(bf), back };
  const fit = normalize(outfit);
  const order = layerOrder.includes("inner") ? layerOrder : DEFAULT_ORDER;
  const drawOrder = [...order].filter((k) => k !== "accessory").reverse();

  const W = 160 * scale;
  const H = (160 * scale * VB_H) / VB_W;
  // light comes from the left; as the figure turns, the shading slides across
  const lightX = clamp(0.5 - sin * 0.45, 0.05, 0.95);

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`} accessibilityLabel={back ? "Mannequin, back view" : "Outfit preview on mannequin"}>
      <Defs>
        <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={sin > 0.3 ? colors.mannequinShade : "#FFFFFF"} />
          <Stop offset={String(lightX)} stopColor={colors.mannequin} />
          <Stop offset="1" stopColor={sin < -0.3 ? "#FFFFFF" : colors.mannequinShade} />
        </LinearGradient>
        <LinearGradient id="cloth" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={sin > 0.3 ? "#000000" : "#FFFFFF"} stopOpacity={sin > 0.3 ? "0.14" : "0.18"} />
          <Stop offset={String(lightX)} stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="1" stopColor={sin < -0.3 ? "#FFFFFF" : "#000000"} stopOpacity={sin < -0.3 ? "0.18" : "0.14"} />
        </LinearGradient>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5F6168" />
          <Stop offset="1" stopColor="#8E9097" />
        </LinearGradient>
      </Defs>

      {backdrop && <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#bg)" />}
      <Ellipse cx={CX} cy={392} rx={46 * (0.7 + 0.3 * Math.abs(cos))} ry={6} fill="#000" opacity={0.12} />

      <G transform={`translate(${CX} 0) scale(${ws * sx} ${hs}) translate(${-CX} 0)`}>
        {mannequin(ctx)}
        {drawOrder.map((slot) => fit[slot] && garment(ctx, slot, fit[slot]))}
        {hair(ctx)}
        {fit.accessory && garment(ctx, "accessory", fit.accessory)}
      </G>
    </Svg>
  );
}

function mannequin({ T, back }) {
  const skin = "url(#skin)";
  return (
    <G key="body">
      <Path d={armPath(ARM.L)} stroke={skin} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={armPath(ARM.R)} stroke={skin} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Ellipse cx={44} cy={202} rx={5.5} ry={10} fill={skin} transform="rotate(14 44 202)" />
      <Ellipse cx={156} cy={202} rx={5.5} ry={10} fill={skin} transform="rotate(-14 156 202)" />
      <Polygon points={legShape(-1, 180, 368)} fill={skin} />
      <Polygon points={legShape(1, 180, 368)} fill={skin} />
      <Path d="M83,366 C80,374 78,382 86,384 L96,384 C98,378 96,370 95,366 Z" fill={skin} />
      <Path d="M117,366 C120,374 122,382 114,384 L104,384 C102,378 104,370 105,366 Z" fill={skin} />
      <Polygon points={torsoShape(T, 66, 198)} fill={skin} />
      <Path d="M93,50 L107,50 L109,70 L91,70 Z" fill={skin} />
      <Ellipse cx={CX} cy={36} rx={14.5} ry={18} fill={skin} />
      {!back && (
        <>
          <Path d="M94,36 Q96,35 98,36 M102,36 Q104,35 106,36" stroke="#C9CAC7" strokeWidth={0.8} fill="none" />
          <Path d="M98,46 Q100,47 102,46" stroke="#C9CAC7" strokeWidth={0.8} fill="none" />
        </>
      )}
      {back && <Path d="M100,72 L100,150" stroke="#D5D6D3" strokeWidth={0.8} />}
    </G>
  );
}

function hair({ back }) {
  if (back) {
    return <Path key="hair" d="M85,38 C83,20 92,15 100,15 C109,15 117,20 115,38 C115,47 114,54 112,58 L88,58 C86,54 85,47 85,38 Z" fill={colors.hair} stroke="#D8D4CB" strokeWidth={0.6} />;
  }
  return (
    <Path
      key="hair"
      d="M85,40 C83,22 92,15 101,15 C112,15 118,23 116,38 C116,46 115,52 113,56 C111,50 112,42 109,36 C104,30 95,28 90,33 C88,38 88,48 87,56 C85,52 85,46 85,40 Z"
      fill={colors.hair}
      stroke="#D8D4CB"
      strokeWidth={0.6}
    />
  );
}

function topLayer({ T, back }, item, mid) {
  const c = item.color;
  const edge = shade(c, 0.25);
  const n = item.name.toLowerCase();
  const tank = /tank|cami/.test(n);
  const short = (/tee/.test(n) && !/long sleeve/.test(n)) || tank;
  const cropped = /crop/.test(n);
  const loose = (mid ? 3.5 : /oversized|relaxed|linen/.test(n) ? 2 : 0.8);
  const hem = cropped ? 140 : mid ? 182 : 178;
  const vneck = /v-neck|v neck/.test(n) && !back;
  return (
    <G key={mid ? "mid" : "inner"}>
      {!tank && (
        <>
          <Path d={armPath(ARM.L, short ? 0.45 : 1)} stroke={c} strokeWidth={12.5 + loose} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d={armPath(ARM.R, short ? 0.45 : 1)} stroke={c} strokeWidth={12.5 + loose} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
      <Polygon points={torsoShape(T, 68, hem, loose, mid ? 2 : 0)} fill={c} stroke={edge} strokeWidth={0.6} />
      <Polygon points={torsoShape(T, 68, hem, loose, mid ? 2 : 0)} fill="url(#cloth)" />
      {back ? (
        <Path d="M93,67 Q100,71 107,67 Z" fill="url(#skin)" />
      ) : vneck ? (
        <Path d="M91,67 L100,92 L109,67 Z" fill="url(#skin)" />
      ) : (
        <Path d="M92,67 Q100,76 108,67 Z" fill="url(#skin)" />
      )}
      {mid && <Path d={`M${CX - lerp(T, hem) - loose},${hem - 5} L${CX + lerp(T, hem) + loose},${hem - 5}`} stroke={edge} strokeWidth={1.2} opacity={0.6} />}
      {/stripe/.test(n) && [90, 104, 118, 132, 146, 160].map((y) => (
        <Path key={y} d={`M${CX - lerp(T, y) - loose},${y} L${CX + lerp(T, y) + loose},${y}`} stroke="#FFFFFF" strokeWidth={2.5} opacity={0.75} />
      ))}
      {!back && /cardigan|button/.test(n) && <Path d={`M100,${vneck ? 92 : 74} L100,${hem}`} stroke={edge} strokeWidth={0.8} />}
    </G>
  );
}

function garment(ctx, slot, item) {
  const { T, back } = ctx;
  const c = item.color;
  const edge = shade(c, 0.25);
  const n = item.name.toLowerCase();

  if (slot === "inner") return topLayer(ctx, item, false);
  if (slot === "mid") return topLayer(ctx, item, true);

  if (slot === "outer") {
    const vest = /vest/.test(n);
    const long = /blazer|coat|longline|trench/.test(n);
    const hem = long ? 208 : /crop/.test(n) ? 146 : 186;
    const left = [];
    const right = [];
    for (let y = 66; y <= hem; y += 4) {
      const w = lerp(T, Math.min(y, 196)) + 6;
      left.push([CX - w, y]);
      right.push([CX + w, y]);
    }
    const gap = /blazer/.test(n) ? 3 : 5;
    const leftPanel = pts([...left, [CX - gap, hem], [CX - gap, 96], [CX - 8, 66]]);
    const rightPanel = pts([...right, [CX + gap, hem], [CX + gap, 96], [CX + 8, 66]]);
    const full = torsoShape(T, 66, hem, 6);
    return (
      <G key="outer">
        {!vest && (
          <>
            <Path d={armPath(ARM.L)} stroke={c} strokeWidth={17.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={armPath(ARM.R)} stroke={c} strokeWidth={17.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
        {back ? (
          <>
            <Polygon points={full} fill={c} stroke={edge} strokeWidth={0.7} />
            <Polygon points={full} fill="url(#cloth)" />
            <Path d={`M88,66 Q100,74 112,66`} stroke={edge} strokeWidth={2} fill="none" />
            <Path d={`M100,76 L100,${hem}`} stroke={edge} strokeWidth={0.6} opacity={0.5} />
          </>
        ) : (
          <>
            <Polygon points={leftPanel} fill={c} stroke={edge} strokeWidth={0.7} />
            <Polygon points={rightPanel} fill={c} stroke={edge} strokeWidth={0.7} />
            <Polygon points={leftPanel} fill="url(#cloth)" />
            <Polygon points={rightPanel} fill="url(#cloth)" />
            <Path d={`M${CX - 8},66 L${CX - 15},70 L${CX - gap},104 Z`} fill={edge} opacity={0.55} />
            <Path d={`M${CX + 8},66 L${CX + 15},70 L${CX + gap},104 Z`} fill={edge} opacity={0.55} />
            {/denim|trucker/.test(n) && (
              <>
                <Rect x={CX - 22} y={92} width={11} height={9} rx={1.5} fill="none" stroke={edge} strokeWidth={0.8} />
                <Rect x={CX + 11} y={92} width={11} height={9} rx={1.5} fill="none" stroke={edge} strokeWidth={0.8} />
              </>
            )}
          </>
        )}
      </G>
    );
  }

  if (slot === "bottom") {
    if (/skirt|dress/.test(n)) {
      const hem = /maxi|long/.test(n) ? 336 : 214;
      const flare = /maxi/.test(n) ? 14 : 12;
      const left = [];
      const right = [];
      for (let y = 150; y <= hem; y += 5) {
        const t = (y - 150) / (hem - 150);
        const w = lerp(T, Math.min(y, 196)) + 1 + flare * t;
        left.push([CX - w, y]);
        right.unshift([CX + w, y]);
      }
      const poly = pts([...left, ...right]);
      return (
        <G key="bottom">
          <Polygon points={poly} fill={c} stroke={edge} strokeWidth={0.6} />
          <Polygon points={poly} fill="url(#cloth)" />
          {/pleat/.test(n) && [-14, -7, 0, 7, 14].map((dx) => <Path key={dx} d={`M${CX + dx * 0.7},158 L${CX + dx * 1.3},${hem - 2}`} stroke={edge} strokeWidth={0.7} opacity={0.6} />)}
          {!back && /slit/.test(n) && <Path d={`M${CX + 6},${hem - 50} L${CX + 7},${hem}`} stroke={edge} strokeWidth={1.2} />}
        </G>
      );
    }
    const wide = /wide|baggy/.test(n);
    const hem = 366;
    const flareTo = wide ? 16 : 0;
    const loose = wide ? 3 : /sweat|jogger|relaxed|straight/.test(n) ? 1.5 : 0.6;
    return (
      <G key="bottom">
        <Polygon points={legShape(-1, 182, hem, loose, flareTo)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={legShape(1, 182, hem, loose, flareTo)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={torsoShape(T, 150, 200, 1.2)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={legShape(-1, 182, hem, loose, flareTo)} fill="url(#cloth)" />
        <Polygon points={legShape(1, 182, hem, loose, flareTo)} fill="url(#cloth)" />
        <Path d={`M${CX - lerp(T, 154) - 1},155 L${CX + lerp(T, 154) + 1},155`} stroke={edge} strokeWidth={1.2} />
        {!back && /jean|denim/.test(n) && <Path d={`M${CX},155 L${CX},196`} stroke={edge} strokeWidth={0.8} />}
        {back && /jean|denim/.test(n) && (
          <>
            <Rect x={CX - 18} y={166} width={12} height={12} rx={2} fill="none" stroke={edge} strokeWidth={0.8} />
            <Rect x={CX + 6} y={166} width={12} height={12} rx={2} fill="none" stroke={edge} strokeWidth={0.8} />
          </>
        )}
      </G>
    );
  }

  if (slot === "shoes") {
    if (/boot/.test(n)) {
      return (
        <G key="shoes">
          <Polygon points={legShape(-1, 286, 370, 1.2)} fill={c} stroke={edge} strokeWidth={0.6} />
          <Polygon points={legShape(1, 286, 370, 1.2)} fill={c} stroke={edge} strokeWidth={0.6} />
          <Path d="M82,364 C78,374 77,384 86,386 L97,386 C99,378 97,368 96,364 Z" fill={c} stroke={edge} strokeWidth={0.6} />
          <Path d="M118,364 C122,374 123,384 114,386 L103,386 C101,378 103,368 104,364 Z" fill={c} stroke={edge} strokeWidth={0.6} />
          <Rect x={92} y={380} width={5} height={8} fill={edge} />
          <Rect x={103} y={380} width={5} height={8} fill={edge} />
        </G>
      );
    }
    const flat = /flat|loafer|mule|clog/.test(n);
    const sole = /gum/.test(n) ? "#C08A4A" : flat ? edge : "#F5F3EE";
    return (
      <G key="shoes">
        <Path d={flat ? "M80,370 C76,378 78,386 88,386 L97,386 C99,380 98,372 96,368 Z" : "M79,364 C73,376 75,386 88,386 L98,386 C100,378 99,368 97,362 Z"} fill={c} stroke={edge} strokeWidth={0.6} />
        <Path d={flat ? "M120,370 C124,378 122,386 112,386 L103,386 C101,380 102,372 104,368 Z" : "M121,364 C127,376 125,386 112,386 L102,386 C100,378 101,368 103,362 Z"} fill={c} stroke={edge} strokeWidth={0.6} />
        <Rect x={76} y={385} width={23} height={3} rx={1.5} fill={sole} />
        <Rect x={101} y={385} width={23} height={3} rx={1.5} fill={sole} />
      </G>
    );
  }

  // accessories
  if (/hoop|earring/.test(n)) {
    return (
      <G key="acc">
        <Circle cx={85} cy={44} r={4} stroke={c} strokeWidth={1.6} fill="none" />
        <Circle cx={115} cy={44} r={4} stroke={c} strokeWidth={1.6} fill="none" />
      </G>
    );
  }
  if (/necklace|chain|pendant/.test(n)) {
    if (back) return <Path key="acc" d="M92,62 Q100,66 108,62" stroke={c} strokeWidth={1} fill="none" />;
    return (
      <G key="acc">
        <Path d="M92,64 Q100,86 108,64" stroke={c} strokeWidth={1} fill="none" />
        {/pearl|pendant|bow/.test(n) ? <Circle cx={100} cy={77} r={2.2} fill="#FBFAF5" stroke={c} strokeWidth={0.6} /> : null}
      </G>
    );
  }
  const tote = /tote/.test(n);
  const slouch = /slouch|hobo|bucket|drawstring/.test(n);
  // seen from the back, the bag hangs on the other side
  return (
    <G key="acc" transform={back ? `translate(${2 * CX} 0) scale(-1 1)` : undefined}>
      <Path d="M121,74 L136,150" stroke={edge} strokeWidth={2} fill="none" />
      {slouch ? (
        <Path d="M126,148 C122,170 126,190 140,192 C154,192 158,170 152,148 C146,142 132,142 126,148 Z" fill={c} stroke={edge} strokeWidth={0.7} />
      ) : (
        <Rect x={tote ? 120 : 126} y={tote ? 146 : 150} width={tote ? 36 : 26} height={tote ? 34 : 22} rx={4} fill={c} stroke={edge} strokeWidth={0.7} />
      )}
    </G>
  );
}
