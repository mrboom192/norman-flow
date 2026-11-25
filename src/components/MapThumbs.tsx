import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";
import type { BasemapType, MapLayer } from "../analysis/mapLayers";
import { useTheme } from "../theme";

// Small drawn previews for the Data layers and Basemap pages. They are
// illustrations of each layer's styling, not pictures of the loaded data.
const roads = [
  "M4 46 C18 40 26 30 60 26",
  "M10 6 C16 22 26 40 30 60",
  "M36 4 L44 60",
  "M2 18 C22 20 40 14 62 10",
];

export function LayerThumb({
  layer,
  size = 56,
}: {
  layer: MapLayer;
  size?: number;
}) {
  const c = useTheme();
  const rank = (scale: readonly string[]) =>
    roads.map((d, i) => (
      <Path
        key={d}
        d={d}
        stroke={scale[Math.max(0, scale.length - 1 - i)]}
        strokeWidth={[5, 3.5, 2.5, 4][i]}
        strokeLinecap="round"
        fill="none"
      />
    ));
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={14} fill={c.mapBackground} />
      {layer === "wards" &&
        [
          "0,0 34,0 30,28 0,34",
          "34,0 64,0 64,30 30,28",
          "0,34 30,28 28,64 0,64",
          "30,28 64,30 64,64 28,64",
        ].map((points, i) => (
          <Polygon
            key={points}
            points={points}
            fill={c.wardFills[i * 2]}
            fillOpacity={c.wardFillOpacity}
            stroke={c.wardStrokes[i * 2]}
            strokeWidth={1.5}
          />
        ))}
      {layer === "segments" &&
        roads.map((d, i) => (
          <Path
            key={d}
            d={d}
            stroke={
              [
                c.segmentLong,
                c.segmentOneMile,
                c.segmentShort,
                c.segmentOneMile,
              ][i]
            }
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      {layer === "combined" && rank([...c.combinedTiers].reverse())}
      {layer === "vc" && rank(c.vcScale)}
      {layer === "collisions" && rank(c.collisionScale)}
      {layer === "hotspots" && (
        <>
          {[
            [24, 26, 20],
            [44, 42, 14],
          ].flatMap(([cx, cy, r]) =>
            c.crashHeatColors.map((color, i, all) => (
              <Circle
                key={`${cx}-${color}`}
                cx={cx}
                cy={cy}
                r={(r * (all.length - i)) / all.length}
                fill={color}
                fillOpacity={0.75}
              />
            )),
          )}
          {[
            [14, 50],
            [52, 14],
          ].map(([cx, cy]) => (
            <Circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={3}
              fill={c.crashMarker}
              stroke={c.white}
              strokeWidth={1}
            />
          ))}
        </>
      )}
    </Svg>
  );
}

export function BasemapThumb({
  type,
  size = 56,
}: {
  type: BasemapType;
  size?: number;
}) {
  if (type === "satellite")
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect width={64} height={64} rx={14} fill="#4F6B3A" />
        <Path d="M0 40 C16 34 30 44 64 30 L64 64 L0 64 Z" fill="#6E7F4A" />
        <Path d="M0 12 C14 18 30 6 64 14 L64 0 L0 0 Z" fill="#3E5A31" />
        <Path
          d="M38 0 C34 20 44 40 30 64"
          stroke="#2F6F8F"
          strokeWidth={5}
          fill="none"
        />
        <Path d="M0 30 L64 22" stroke="#C9C2B0" strokeWidth={2.5} />
        <Path d="M18 0 L24 64" stroke="#C9C2B0" strokeWidth={2} />
        <Rect x={44} y={40} width={8} height={6} fill="#B8B2A6" />
        <Rect x={6} y={44} width={7} height={5} fill="#A9A39A" />
      </Svg>
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={14} fill="#EEF3EA" />
      <Path d="M0 46 C14 40 22 52 40 64 L0 64 Z" fill="#CDEBC2" />
      <Path
        d="M38 0 C34 20 44 40 30 64"
        stroke="#9CD3F0"
        strokeWidth={6}
        fill="none"
      />
      <Path d="M0 30 L64 22" stroke="#FFFFFF" strokeWidth={4} />
      <Path d="M0 30 L64 22" stroke="#F6D38A" strokeWidth={2} />
      <Path d="M18 0 L24 64" stroke="#FFFFFF" strokeWidth={3} />
      <Path d="M50 0 L56 64" stroke="#FFFFFF" strokeWidth={2.5} />
    </Svg>
  );
}
