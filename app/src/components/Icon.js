// Simple line icons drawn with SVG (no icon library needed)
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

export default function Icon({ name, size = 22, color = colors.ink, strokeWidth = 1.8 }) {
  const p = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "discover" && (<><Rect x="6" y="3" width="12" height="18" rx="3" {...p} /><Path d="M10.5 9.5 L14.5 12 L10.5 14.5 Z" {...p} /></>)}
      {name === "studio" && (<><Path d="M12 6 a2 2 0 1 1 2 2 c-1 .4-2 1-2 2 L3.5 16 a1.5 1.5 0 0 0 .9 2.7 h15.2 a1.5 1.5 0 0 0 .9-2.7 L12 10" {...p} /></>)}
      {name === "saved" && <Path d="M7 4 h10 a1 1 0 0 1 1 1 v15 l-6-4 l-6 4 V5 a1 1 0 0 1 1-1 z" {...p} />}
      {name === "community" && (<><Circle cx="9" cy="9" r="3" {...p} /><Circle cx="16.5" cy="10" r="2.4" {...p} /><Path d="M3.5 19 c.8-3 3-4.5 5.5-4.5 s4.7 1.5 5.5 4.5 M15 14.6 c2.2-.3 4.4.8 5.3 3.4" {...p} /></>)}
      {name === "profile" && (<><Circle cx="12" cy="8.5" r="3.5" {...p} /><Path d="M5 20 c1-3.6 3.8-5.5 7-5.5 s6 1.9 7 5.5" {...p} /></>)}
      {name === "bag" && (<><Path d="M5 8 h14 l-1 12 H6 Z" {...p} /><Path d="M9 8 V7 a3 3 0 0 1 6 0 v1" {...p} /></>)}
      {name === "plus" && <Path d="M12 5 v14 M5 12 h14" {...p} />}
      {name === "sparkle" && <Path d="M12 3 c.6 4 2 5.4 6 6 c-4 .6-5.4 2-6 6 c-.6-4-2-5.4-6-6 c4-.6 5.4-2 6-6 z M18.5 15 c.3 1.8.9 2.4 2.5 2.7 c-1.6.3-2.2.9-2.5 2.6 c-.3-1.7-.9-2.3-2.5-2.6 c1.6-.3 2.2-.9 2.5-2.7 z" {...p} />}
      {name === "close" && <Path d="M6 6 L18 18 M18 6 L6 18" {...p} />}
      {name === "back" && <Path d="M15 5 L8 12 L15 19" {...p} />}
      {name === "next" && <Path d="M9 5 L16 12 L9 19" {...p} />}
      {name === "heart" && <Path d="M12 20 s-7-4.4-7-10 a4 4 0 0 1 7-2.6 a4 4 0 0 1 7 2.6 c0 5.6-7 10-7 10 z" {...p} />}
      {name === "shuffle" && <Path d="M4 7 h3 c5 0 5 10 10 10 h3 M17 14 l3 3 l-3 3 M4 17 h3 c1.6 0 2.6-1 3.4-2.4 M14 9.4 c.8-1.4 1.8-2.4 3-2.4 h3 M17 4 l3 3 l-3 3" {...p} />}
      {name === "lock" && (<><Rect x="5" y="11" width="14" height="9" rx="2" {...p} /><Path d="M8 11 V8 a4 4 0 0 1 8 0 v3" {...p} /></>)}
      {name === "camera" && (<><Path d="M4 8 h3 l1.5-2 h7 L17 8 h3 v11 H4 Z" {...p} /><Circle cx="12" cy="13" r="3.4" {...p} /></>)}
    </Svg>
  );
}
