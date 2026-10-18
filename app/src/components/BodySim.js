// The avatar: a smooth white mannequin (like a 3D fashion render), drawn with SVG.
// Clothes are built from the body's own measurements, so they follow its shape.
// Layer order comes from the Studio (outerwear can go over or under the top).
// Profile measurements make the figure taller/wider. Illustrative only, not exact fit.
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import { colors } from "../theme";

const DEFAULT_ORDER = ["outerwear", "top", "bottom", "shoes", "accessory"];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const VB_W = 200;
const VB_H = 420;

function inches(value, unit) {
  const n = parseFloat(value);
  if (!n) return null;
  return unit === "cm" ? n / 2.54 : n;
}

// ---- body geometry (viewBox units) ----
const CX = 100;
// torso half-width at a given height
const TORSO = [[66, 9], [72, 21], [80, 25], [98, 24], [118, 19.5], [140, 15], [158, 19], [176, 22.5], [196, 21.5]];
// distance of each leg's center from the middle, and the leg's half-width
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

// A shape that wraps the torso from yTop to yBottom, `loose` units away from the body
function torsoShape(yTop, yBottom, loose = 0, flare = 0) {
  const left = [];
  const right = [];
  for (let y = yTop; y <= yBottom; y += 4) {
    const t = (y - yTop) / Math.max(1, yBottom - yTop);
    const w = lerp(TORSO, y) + loose + flare * t;
    left.push([CX - w, y]);
    right.unshift([CX + w, y]);
  }
  return pts([...left, ...right]);
}

// A shape around one leg (side = -1 left, 1 right) from yTop to yBottom
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

// Arms are drawn as thick lines: shoulder → elbow → wrist (A-pose)
const ARM = {
  L: { s: [77, 78], e: [61, 136], w: [47, 190] },
  R: { s: [123, 78], e: [139, 136], w: [153, 190] },
};
function armPath(a, toElbowOnly = false, part = 1) {
  if (toElbowOnly) {
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

export default function BodySim({ outfit = {}, profile = {}, layerOrder = DEFAULT_ORDER, scale = 1, backdrop = false }) {
  const heightIn = inches(profile.height, profile.unit) || 65;
  const waistIn = inches(profile.waist, profile.unit) || 28;
  const hs = clamp(heightIn / 65, 0.92, 1.08);
  const ws = clamp(waistIn / 28, 0.85, 1.25);

  const W = 160 * scale;
  const H = (160 * scale * VB_H) / VB_W;
  const order = [...layerOrder].filter((k) => k !== "accessory").reverse();

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`} accessibilityLabel="Outfit preview on mannequin">
      <Defs>
        <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor={colors.mannequin} />
          <Stop offset="1" stopColor={colors.mannequinShade} />
        </LinearGradient>
        <LinearGradient id="cloth" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.14" />
        </LinearGradient>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5F6168" />
          <Stop offset="1" stopColor="#8E9097" />
        </LinearGradient>
      </Defs>

      {backdrop && <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#bg)" />}
      <Ellipse cx={CX} cy={392} rx={46} ry={6} fill="#000" opacity={0.12} />

      <G transform={`translate(${CX} 0) scale(${ws} ${hs}) translate(${-CX} 0)`}>
        <Mannequin />
        {order.map((cat) => outfit[cat] && <Garment key={cat} cat={cat} item={outfit[cat]} />)}
        <Hair />
        {outfit.accessory && <Garment cat="accessory" item={outfit.accessory} />}
      </G>
    </Svg>
  );
}

function Mannequin() {
  const skin = "url(#skin)";
  return (
    <G>
      {/* arms */}
      <Path d={armPath(ARM.L)} stroke={skin} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={armPath(ARM.R)} stroke={skin} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Ellipse cx={44} cy={202} rx={5.5} ry={10} fill={skin} transform="rotate(14 44 202)" />
      <Ellipse cx={156} cy={202} rx={5.5} ry={10} fill={skin} transform="rotate(-14 156 202)" />
      {/* legs */}
      <Polygon points={legShape(-1, 180, 368)} fill={skin} />
      <Polygon points={legShape(1, 180, 368)} fill={skin} />
      {/* bare feet in simple heels */}
      <Path d="M83,366 C80,374 78,382 86,384 L96,384 C98,378 96,370 95,366 Z" fill={skin} />
      <Path d="M117,366 C120,374 122,382 114,384 L104,384 C102,378 104,370 105,366 Z" fill={skin} />
      {/* torso + neck + head */}
      <Polygon points={torsoShape(66, 198)} fill={skin} />
      <Path d="M93,50 L107,50 L109,70 L91,70 Z" fill={skin} />
      <Ellipse cx={CX} cy={36} rx={14.5} ry={18} fill={skin} />
      {/* subtle face */}
      <Path d="M94,36 Q96,35 98,36 M102,36 Q104,35 106,36" stroke="#C9CAC7" strokeWidth={0.8} fill="none" />
      <Path d="M98,46 Q100,47 102,46" stroke="#C9CAC7" strokeWidth={0.8} fill="none" />
    </G>
  );
}

function Hair() {
  // short bob, like the 3D mannequin reference
  return (
    <Path
      d="M85,40 C83,22 92,15 101,15 C112,15 118,23 116,38 C116,46 115,52 113,56 C111,50 112,42 109,36 C104,30 95,28 90,33 C88,38 88,48 87,56 C85,52 85,46 85,40 Z"
      fill={colors.hair}
      stroke="#D8D4CB"
      strokeWidth={0.6}
    />
  );
}

function Garment({ cat, item }) {
  const c = item.color;
  const edge = shade(c, 0.25);
  const n = item.name.toLowerCase();

  if (cat === "top") {
    const tank = /tank|cami/.test(n);
    const short = (/tee/.test(n) && !/long sleeve/.test(n)) || tank;
    const cropped = /crop/.test(n);
    const loose = /oversized|chunky|relaxed|sweater|knit|cardigan|pullover/.test(n) ? 3 : 1;
    const hem = cropped ? 140 : loose > 2 ? 182 : 176;
    const vneck = /v-neck|v neck/.test(n);
    return (
      <G>
        {!tank && (
          <>
            <Path d={short ? armPath(ARM.L, true, 0.45) : armPath(ARM.L)} stroke={c} strokeWidth={13 + loose} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={short ? armPath(ARM.R, true, 0.45) : armPath(ARM.R)} stroke={c} strokeWidth={13 + loose} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
        <Polygon points={torsoShape(68, hem, loose, loose > 2 ? 2 : 0)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={torsoShape(68, hem, loose, loose > 2 ? 2 : 0)} fill="url(#cloth)" />
        {/* neckline */}
        {vneck ? (
          <Path d="M91,67 L100,92 L109,67 Z" fill="url(#skin)" />
        ) : (
          <Path d="M92,67 Q100,76 108,67 Z" fill="url(#skin)" />
        )}
        {/knit|sweater|cardigan/.test(n) && <Path d={`M${CX - lerp(TORSO, hem) - loose},${hem - 5} L${CX + lerp(TORSO, hem) + loose},${hem - 5}`} stroke={edge} strokeWidth={1.2} opacity={0.6} />}
        {/stripe/.test(n) && [90, 104, 118, 132, 146, 160].map((y) => (
          <Path key={y} d={`M${CX - lerp(TORSO, y) - loose},${y} L${CX + lerp(TORSO, y) + loose},${y}`} stroke="#FFFFFF" strokeWidth={2.5} opacity={0.75} />
        ))}
        {/cardigan|button/.test(n) && <Path d={`M100,${vneck ? 92 : 74} L100,${hem}`} stroke={edge} strokeWidth={0.8} />}
      </G>
    );
  }

  if (cat === "outerwear") {
    const vest = /vest/.test(n);
    const long = /blazer|coat|longline|trench/.test(n);
    const hem = long ? 208 : /crop/.test(n) ? 146 : 186;
    const left = [];
    const right = [];
    for (let y = 66; y <= hem; y += 4) {
      const w = lerp(TORSO, Math.min(y, 196)) + 5;
      left.push([CX - w, y]);
      right.push([CX + w, y]);
    }
    const gap = /blazer/.test(n) ? 3 : 5;
    const leftPanel = pts([...left, [CX - gap, hem], [CX - gap, 96], [CX - 8, 66]]);
    const rightPanel = pts([...right, [CX + gap, hem], [CX + gap, 96], [CX + 8, 66]]);
    return (
      <G>
        {!vest && (
          <>
            <Path d={armPath(ARM.L)} stroke={c} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={armPath(ARM.R)} stroke={c} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
        <Polygon points={leftPanel} fill={c} stroke={edge} strokeWidth={0.7} />
        <Polygon points={rightPanel} fill={c} stroke={edge} strokeWidth={0.7} />
        <Polygon points={leftPanel} fill="url(#cloth)" />
        <Polygon points={rightPanel} fill="url(#cloth)" />
        {/* lapels / collar */}
        <Path d={`M${CX - 8},66 L${CX - 15},70 L${CX - gap},104 Z`} fill={edge} opacity={0.55} />
        <Path d={`M${CX + 8},66 L${CX + 15},70 L${CX + gap},104 Z`} fill={edge} opacity={0.55} />
        {/denim|trucker/.test(n) && (
          <>
            <Rect x={CX - 22} y={92} width={11} height={9} rx={1.5} fill="none" stroke={edge} strokeWidth={0.8} />
            <Rect x={CX + 11} y={92} width={11} height={9} rx={1.5} fill="none" stroke={edge} strokeWidth={0.8} />
          </>
        )}
      </G>
    );
  }

  if (cat === "bottom") {
    if (/skirt|dress/.test(n)) {
      const hem = /maxi|long/.test(n) ? 336 : 214;
      const flare = /maxi/.test(n) ? 14 : 12;
      // skirt body continues past the hips down to the hem
      const left = [];
      const right = [];
      for (let y = 150; y <= hem; y += 5) {
        const t = (y - 150) / (hem - 150);
        const w = lerp(TORSO, Math.min(y, 196)) + 1 + flare * t;
        left.push([CX - w, y]);
        right.unshift([CX + w, y]);
      }
      const poly = pts([...left, ...right]);
      return (
        <G>
          <Polygon points={poly} fill={c} stroke={edge} strokeWidth={0.6} />
          <Polygon points={poly} fill="url(#cloth)" />
          {/pleat/.test(n) && [-14, -7, 0, 7, 14].map((dx) => <Path key={dx} d={`M${CX + dx * 0.7},158 L${CX + dx * 1.3},${hem - 2}`} stroke={edge} strokeWidth={0.7} opacity={0.6} />)}
          {/slit/.test(n) && <Path d={`M${CX + 6},${hem - 50} L${CX + 7},${hem}`} stroke={edge} strokeWidth={1.2} />}
        </G>
      );
    }
    const wide = /wide|baggy/.test(n);
    const shorts = /short/.test(n) && !/shorts? sleeve/.test(n);
    const hem = shorts ? 222 : 366;
    const flareTo = wide ? 16 : 0;
    const loose = wide ? 3 : /sweat|jogger|relaxed|straight/.test(n) ? 1.5 : 0.6;
    return (
      <G>
        <Polygon points={legShape(-1, 182, hem, loose, flareTo)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={legShape(1, 182, hem, loose, flareTo)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={torsoShape(150, 200, 1.2)} fill={c} stroke={edge} strokeWidth={0.6} />
        <Polygon points={legShape(-1, 182, hem, loose, flareTo)} fill="url(#cloth)" />
        <Polygon points={legShape(1, 182, hem, loose, flareTo)} fill="url(#cloth)" />
        <Path d={`M${CX - lerp(TORSO, 154) - 1},155 L${CX + lerp(TORSO, 154) + 1},155`} stroke={edge} strokeWidth={1.2} />
        {/jean|denim/.test(n) && <Path d={`M${CX},155 L${CX},196`} stroke={edge} strokeWidth={0.8} />}
      </G>
    );
  }

  if (cat === "shoes") {
    if (/boot/.test(n)) {
      return (
        <G>
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
      <G>
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
      <G>
        <Circle cx={85} cy={44} r={4} stroke={c} strokeWidth={1.6} fill="none" />
        <Circle cx={115} cy={44} r={4} stroke={c} strokeWidth={1.6} fill="none" />
      </G>
    );
  }
  if (/necklace|chain|pendant/.test(n)) {
    return (
      <G>
        <Path d="M92,64 Q100,86 108,64" stroke={c} strokeWidth={1} fill="none" />
        {/pearl|pendant|bow/.test(n) ? <Circle cx={100} cy={77} r={2.2} fill="#FBFAF5" stroke={c} strokeWidth={0.6} /> : null}
      </G>
    );
  }
  // bags
  const tote = /tote/.test(n);
  const slouch = /slouch|hobo|bucket|drawstring/.test(n);
  return (
    <G>
      <Path d="M121,74 L136,150" stroke={edge} strokeWidth={2} fill="none" />
      {slouch ? (
        <Path d="M126,148 C122,170 126,190 140,192 C154,192 158,170 152,148 C146,142 132,142 126,148 Z" fill={c} stroke={edge} strokeWidth={0.7} />
      ) : (
        <Rect x={tote ? 120 : 126} y={tote ? 146 : 150} width={tote ? 36 : 26} height={tote ? 34 : 22} rx={4} fill={c} stroke={edge} strokeWidth={0.7} />
      )}
    </G>
  );
}
