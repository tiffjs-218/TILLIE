// Real 3D mannequin (three.js on expo-gl). Body and clothes are 3D shapes with lighting,
// so turning it shows real depth: the jacket wraps around, the bag swings to the back.
// - `angle` (degrees) turns the figure; it eases toward the new angle.
// - Clothes are layered by slot: inner → mid → outer, each a little further from the body.
// - Height / bust / waist from Profile reshape the body. Illustrative, not an exact fit.
// If 3D can't start on a device, `onError` lets the screen fall back to the 2D avatar.
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { DEFAULT_ORDER } from "../theme";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const TOPS = ["outer", "mid", "inner"];

function inches(value, unit) {
  const n = parseFloat(value);
  if (!n) return null;
  return unit === "cm" ? n / 2.54 : n;
}

// interpolate a [y, r] table
function at(table, y) {
  if (y <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [y1, r1] = table[i];
    const [y0, r0] = table[i - 1];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return table[table.length - 1][1];
}

// Smooth body-shaped surface: radius profile `table` between y0..y1, grown by `extra`
function lathe(table, y0, y1, extra = 0, opts = {}) {
  const { flare = 0, open = 0, steps = 28, capTop = true, capBottom = true } = opts;
  const pts = [];
  if (capBottom) pts.push(new THREE.Vector2(0.0001, y0));
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    const t = 1 - i / steps; // 1 at bottom → flare is widest at the hem
    pts.push(new THREE.Vector2(at(table, y) + extra + flare * t * t, y));
  }
  if (capTop) pts.push(new THREE.Vector2(0.0001, y1));
  // phi = 0 faces the camera (+z). `open` leaves a gap at the front (open jacket).
  return new THREE.LatheGeometry(pts, 40, open, Math.PI * 2 - open * 2);
}

// Body profiles (meters, y = height from the floor)
const torsoTable = (bust, male) => male ? [
  [0.84, 0.13], [0.9, 0.152], [0.97, 0.15], [1.04, 0.14], [1.1, 0.142],
  [1.18, 0.155], [1.26, 0.166], [1.34, 0.182], [1.4, 0.172], [1.44, 0.1], [1.46, 0.056],
] : [
  [0.84, 0.13], [0.9, 0.165], [0.97, 0.17], [1.04, 0.135], [1.1, 0.125],
  [1.18, 0.15 * bust], [1.26, 0.158 * bust], [1.34, 0.165], [1.4, 0.16], [1.44, 0.09], [1.46, 0.05],
];
// clothes never go narrower than the legs underneath at the hips
const clothTable = (bust, male) => torsoTable(bust, male).map(([y, r]) => [y, y < 1.0 ? Math.max(r, 0.18) : r]);
const LEG = [[0.06, 0.032], [0.1, 0.036], [0.34, 0.056], [0.48, 0.048], [0.64, 0.068], [0.82, 0.085], [0.92, 0.09]];
const ARM = [[-0.6, 0.026], [-0.5, 0.028], [-0.28, 0.037], [-0.1, 0.045], [0, 0.05]];
const LEG_X = 0.085;
const SHOULDER = { x: 0.185, y: 1.38, tilt: 0.36 };

function material(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0, side: THREE.DoubleSide });
}

function normalize(outfit) {
  const o = { ...outfit };
  if (o.top && !o.inner && !o.mid) o.inner = o.top;
  if (o.outerwear && !o.outer) o.outer = o.outerwear;
  delete o.top;
  delete o.outerwear;
  return o;
}

// ---------- building the figure ----------
function buildBody(shape) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xf3f3f1, roughness: 0.55, metalness: 0 });
  const T = torsoTable(shape.bust, shape.male);

  const torso = new THREE.Mesh(lathe(T, 0.84, 1.46), skin);
  torso.scale.z = 0.66;
  g.add(torso);

  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(lathe(LEG, 0.05, 0.92), skin);
    leg.position.x = side * LEG_X;
    leg.scale.z = 0.92;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
    foot.scale.set(0.036, 0.03, 0.09);
    foot.position.set(side * LEG_X, 0.035, 0.035);
    g.add(foot);

    shoulderCap(g, side, 0.05, skin);
    const arm = new THREE.Group();
    arm.position.set(side * SHOULDER.x, SHOULDER.y, 0);
    arm.rotation.z = side * SHOULDER.tilt;
    const a = new THREE.Mesh(lathe(ARM, -0.6, -0.02), skin);
    arm.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin);
    hand.scale.set(0.028, 0.07, 0.04);
    hand.position.y = -0.66;
    arm.add(hand);
    g.add(arm);
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.12, 20), skin);
  neck.position.y = 1.5;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 24), skin);
  head.scale.set(1, 1.22, 1.05);
  head.position.y = 1.64;
  g.add(head);

  // short bob, like the reference render
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.7 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.104, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  cap.scale.set(1, 1.18, 1.08);
  cap.position.set(0, 1.655, -0.006);
  g.add(cap);
  if (shape.male) {
    cap.scale.set(1, 1.05, 1.06);
    cap.position.y = 1.67;
    return g;
  }
  const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.11, 0.1, 32, 1, true, Math.PI * 0.32, Math.PI * 1.36), hairMat);
  bob.position.set(0, 1.61, -0.012);
  bob.scale.z = 1.05;
  g.add(bob);
  return g;
}

function shoulderCap(g, side, radius, mat) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), mat);
  cap.position.set(side * (SHOULDER.x - 0.004), SHOULDER.y - 0.012, 0);
  cap.scale.z = 0.85;
  g.add(cap);
}

function addTop(g, item, extra, isMid, shape) {
  const n = item.name.toLowerCase();
  const mat = material(item.color, isMid ? 0.95 : 0.8);
  const T = clothTable(shape.bust, shape.male);
  const tank = /tank|cami/.test(n);
  const short = (/tee/.test(n) && !/long sleeve/.test(n)) || tank;
  const hem = /crop/.test(n) ? 1.1 : isMid ? 0.9 : 0.93;
  const body = new THREE.Mesh(lathe(T, hem, 1.445, extra, { flare: isMid ? 0.02 : 0.006, capBottom: false }), mat);
  body.scale.z = 0.68;
  g.add(body);
  if (!tank) {
    [-1, 1].forEach((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * SHOULDER.x, SHOULDER.y, 0);
      arm.rotation.z = side * SHOULDER.tilt;
      const sleeve = new THREE.Mesh(lathe(ARM, short ? -0.16 : -0.58, -0.02, extra * 0.45 + 0.004, { capBottom: false, capTop: false }), mat);
      arm.add(sleeve);
      g.add(arm);
      shoulderCap(g, side, 0.052 + extra * 0.45, mat);
    });
  }
  // ribbed hem on knits
  if (isMid || /knit|sweater/.test(n)) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(at(T, hem) + extra + 0.004, 0.008, 8, 40), material(darker(item.color)));
    rib.rotation.x = Math.PI / 2;
    rib.scale.y = 0.68;
    rib.position.y = hem + 0.01;
    g.add(rib);
  }
}

function addOuter(g, item, extra, shape) {
  const n = item.name.toLowerCase();
  const mat = material(item.color, 0.75);
  const T = clothTable(shape.bust, shape.male);
  const long = /blazer|coat|longline|trench/.test(n);
  const hem = long ? 0.74 : /crop/.test(n) ? 1.08 : 0.9;
  const vest = /vest/.test(n);
  const body = new THREE.Mesh(lathe(T, hem, 1.45, extra, { flare: long ? 0.03 : 0.012, open: 0.22, capBottom: false, capTop: false }), mat);
  body.scale.z = 0.7;
  g.add(body);
  // collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 10, 30, Math.PI * 1.6), material(darker(item.color)));
  collar.rotation.x = Math.PI / 2;
  collar.rotation.z = Math.PI * 0.7;
  collar.position.y = 1.455;
  g.add(collar);
  if (!vest) {
    [-1, 1].forEach((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * SHOULDER.x, SHOULDER.y, 0);
      arm.rotation.z = side * SHOULDER.tilt;
      arm.add(new THREE.Mesh(lathe(ARM, -0.6, -0.02, extra * 0.5 + 0.008, { capBottom: false, capTop: false }), mat));
      g.add(arm);
      shoulderCap(g, side, 0.056 + extra * 0.5, mat);
    });
  }
}

function addBottom(g, item, shape) {
  const n = item.name.toLowerCase();
  const mat = material(item.color, 0.85);
  const T = clothTable(shape.bust, shape.male);
  if (/skirt|dress/.test(n)) {
    const maxi = /maxi|long/.test(n);
    const skirt = new THREE.Mesh(lathe(T, maxi ? 0.22 : 0.66, 1.05, 0.008, { flare: maxi ? 0.13 : 0.06, capBottom: false }), mat);
    skirt.scale.z = 0.78;
    g.add(skirt);
    return;
  }
  const wide = /wide|baggy/.test(n);
  const hips = new THREE.Mesh(lathe(T, 0.82, 1.05, 0.008), mat);
  hips.scale.z = 0.68;
  g.add(hips);
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(lathe(LEG, 0.07, 0.9, wide ? 0.016 : /straight|sweat|relaxed/.test(n) ? 0.01 : 0.006, { flare: wide ? 0.05 : 0, capBottom: false }), mat);
    leg.position.x = side * LEG_X;
    leg.scale.z = 0.95;
    g.add(leg);
  });
  const band = new THREE.Mesh(new THREE.TorusGeometry(at(T, 1.04) + 0.012, 0.007, 8, 40), material(darker(item.color)));
  band.rotation.x = Math.PI / 2;
  band.scale.y = 0.68;
  band.position.y = 1.04;
  g.add(band);
}

function addShoes(g, item) {
  const n = item.name.toLowerCase();
  const mat = material(item.color, 0.5);
  [-1, 1].forEach((side) => {
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
    shoe.scale.set(0.045, /flat|loafer|mule|clog/.test(n) ? 0.034 : 0.045, 0.105);
    shoe.position.set(side * LEG_X, 0.035, 0.035);
    g.add(shoe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.2), material(/sneaker|low-top|canvas/.test(n) ? "#F4F2EC" : darker(item.color)));
    sole.position.set(side * LEG_X, 0.007, 0.035);
    g.add(sole);
    if (/boot/.test(n)) {
      const shaft = new THREE.Mesh(lathe(LEG, 0.05, 0.44, 0.01, { capBottom: false }), mat);
      shaft.position.x = side * LEG_X;
      g.add(shaft);
    }
  });
}

function addAccessory(g, item) {
  const n = item.name.toLowerCase();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(item.color), roughness: /gold|silver|hoop|chain|necklace/.test(n) ? 0.25 : 0.7, metalness: /gold|silver|hoop|chain|necklace/.test(n) ? 0.8 : 0 });
  if (/hoop|earring/.test(n)) {
    [-1, 1].forEach((side) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 24), mat);
      hoop.position.set(side * 0.098, 1.585, 0.005);
      hoop.rotation.y = Math.PI / 2;
      g.add(hoop);
    });
    return;
  }
  if (/necklace|chain|pendant/.test(n)) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.0025, 6, 40), mat);
    chain.rotation.x = Math.PI / 2 - 0.5;
    chain.position.set(0, 1.41, 0.02);
    g.add(chain);
    if (/pearl|pendant|bow/.test(n)) {
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfbfaf5, roughness: 0.2 }));
      pearl.position.set(0, 1.37, 0.085);
      g.add(pearl);
    }
    return;
  }
  // bag on the right shoulder, strap across
  const slouch = /slouch|hobo|bucket|drawstring/.test(n);
  const tote = /tote/.test(n);
  const bag = new THREE.Mesh(slouch ? new THREE.SphereGeometry(1, 24, 16) : new THREE.BoxGeometry(1, 1, 1), mat);
  if (slouch) bag.scale.set(0.085, 0.1, 0.05);
  else bag.scale.set(tote ? 0.2 : 0.15, tote ? 0.17 : 0.11, 0.05);
  bag.position.set(0.25, 0.96, 0.03);
  bag.rotation.z = 0.12;
  g.add(bag);
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.48, 6), material(darker(item.color)));
  strap.position.set(0.215, 1.2, 0.04);
  strap.rotation.z = 0.12;
  g.add(strap);
}

function darker(hex, amount = 0.22) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return `#${c.getHexString()}`;
}

function buildOutfit(outfit, layerOrder, shape) {
  const g = new THREE.Group();
  const fit = normalize(outfit);
  const order = (layerOrder.includes("inner") ? layerOrder : DEFAULT_ORDER).filter((s) => TOPS.includes(s));
  // the outermost layer sits furthest from the body
  const extraFor = (slot) => 0.007 + (order.length - 1 - order.indexOf(slot)) * 0.014;
  if (fit.bottom) addBottom(g, fit.bottom, shape);
  if (fit.inner) addTop(g, fit.inner, extraFor("inner"), false, shape);
  if (fit.mid) addTop(g, fit.mid, extraFor("mid"), true, shape);
  if (fit.outer) addOuter(g, fit.outer, extraFor("outer"), shape);
  if (fit.shoes) addShoes(g, fit.shoes);
  if (fit.accessory) addAccessory(g, fit.accessory);
  return g;
}

function dispose(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

// ---------- component ----------
export default function Avatar3D({ outfit = {}, profile = {}, layerOrder = DEFAULT_ORDER, angle = 0, background = "#DCE3EF", style, onError }) {
  const ref = useRef({ target: 0, raf: null, scene: null, figure: null, clothes: null, built: "" });
  ref.current.target = (angle * Math.PI) / 180;

  const heightIn = inches(profile.height, profile.unit) || 65;
  const waistIn = inches(profile.waist, profile.unit) || 28;
  const bustIn = inches(profile.bust, profile.unit) || 34;
  const male = /^male$/i.test(profile.gender || "");
  const shape = {
    male,
    h: clamp(heightIn / (male ? 69 : 65), 0.92, 1.08) * (male ? 1.04 : 1),
    w: clamp(waistIn / 28, 0.85, 1.25),
    bust: clamp(bustIn / 34 / clamp(waistIn / 28, 0.85, 1.25), 0.88, 1.18),
  };
  const key = JSON.stringify({ o: normalize(outfit), layerOrder, shape });

  // rebuild body + clothes when the outfit or measurements change
  useEffect(() => {
    const r = ref.current;
    if (!r.figure) return;
    try {
      if (r.body) { r.figure.remove(r.body); dispose(r.body); }
      if (r.clothes) { r.figure.remove(r.clothes); dispose(r.clothes); }
      r.body = buildBody(shape);
      r.clothes = buildOutfit(outfit, layerOrder, shape);
      r.figure.add(r.body);
      r.figure.add(r.clothes);
      r.figure.scale.set(shape.w, shape.h, shape.w);
    } catch (e) {
      onError?.(e);
    }
  }, [key]);

  useEffect(() => () => cancelAnimationFrame(ref.current.raf), []);

  function onContextCreate(gl) {
    const r = ref.current;
    try {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      if (!gl.getContextAttributes) gl.getContextAttributes = () => ({ alpha: true, antialias: false, depth: true, stencil: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
      const canvas = { width, height, style: {}, clientWidth: width, clientHeight: height, addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl };
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.setClearColor(new THREE.Color(background), 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(26, width / height, 0.1, 20);
      camera.position.set(0, 0.98, 4.3);
      camera.lookAt(0, 0.88, 0);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-2, 3, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 0.9);
      rim.position.set(2.5, 2, -2);
      scene.add(rim);

      // soft floor shadow
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.y = 0.55;
      shadow.position.y = 0.001;
      scene.add(shadow);

      const figure = new THREE.Group();
      scene.add(figure);
      r.scene = scene;
      r.figure = figure;
      r.body = buildBody(shape);
      r.clothes = buildOutfit(outfit, layerOrder, shape);
      figure.add(r.body);
      figure.add(r.clothes);
      figure.scale.set(shape.w, shape.h, shape.w);
      figure.rotation.y = r.target;

      const loop = () => {
        try {
          // ease toward the requested angle
          figure.rotation.y += (r.target - figure.rotation.y) * 0.18;
          renderer.render(scene, camera);
          gl.endFrameEXP();
          r.raf = requestAnimationFrame(loop);
        } catch (e) {
          onError?.(e);
        }
      };
      loop();
    } catch (e) {
      onError?.(e);
    }
  }

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, style]} accessible accessibilityLabel="3D outfit preview, drag to turn">
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}

export { buildBody, buildOutfit };
