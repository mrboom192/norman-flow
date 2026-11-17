import { createContext, useContext, useMemo } from "react";
import { Circle, G, Rect, Text } from "react-native-svg";
import type { CrashPoint } from "../analysis/types";
import { createCrashLocationIndex } from "../analysis/crashLocationIndex";
import { useTheme } from "../theme";

export const MapViewport = createContext({
  x: 180,
  y: 180,
  width: 360,
  height: 360,
  unitsPerPixel: 1,
});

export function CrashPointDots({
  points,
  project,
  midLat,
  midLon,
  latScale,
  lonScale,
}: {
  points: CrashPoint[];
  project: (point: number[]) => string;
  midLat: number;
  midLon: number;
  latScale: number;
  lonScale: number;
}) {
  const c = useTheme();
  const view = useContext(MapViewport);
  const index = useMemo(() => createCrashLocationIndex(points), [points]);
  const sites = index({
    latitude: midLat - (view.y - 180) / latScale,
    longitude: midLon + (view.x - 180) / lonScale,
    latitudeDelta: (view.height * view.unitsPerPixel) / latScale,
    longitudeDelta: (view.width * view.unitsPerPixel) / lonScale,
    width: view.width,
    height: view.height,
  });
  return (
    <G pointerEvents="none">
      {sites.map((site) => {
        const [x, y] = project([site.latitude, site.longitude])
          .split(",")
          .map(Number);
        const label = site.count.toLocaleString() + "+";
        const width = Math.max(30, label.length * 7 + 10);
        return (
          <G
            key={site.id}
            transform={`translate(${x} ${y}) scale(${view.unitsPerPixel})`}
          >
            {site.count === 1 ? (
              <Circle r={4} fill={c.crashMarker} stroke={c.white} />
            ) : (
              <>
                <Rect
                  x={-width / 2}
                  y={-12}
                  width={width}
                  height={24}
                  rx={12}
                  fill={c.crashMarker}
                  stroke={c.white}
                />
                <Text
                  y={4}
                  textAnchor="middle"
                  fill={c.white}
                  fontSize={11}
                  fontWeight="bold"
                >
                  {label}
                </Text>
              </>
            )}
          </G>
        );
      })}
    </G>
  );
}
