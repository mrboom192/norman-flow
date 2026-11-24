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
  unproject,
}: {
  points: CrashPoint[];
  project: (point: number[]) => string;
  unproject: (x: number, y: number) => { lat: number; lng: number };
}) {
  const c = useTheme();
  const view = useContext(MapViewport);
  const index = useMemo(() => createCrashLocationIndex(points), [points]);
  const halfWidth = (view.width * view.unitsPerPixel) / 2;
  const halfHeight = (view.height * view.unitsPerPixel) / 2;
  const northwest = unproject(view.x - halfWidth, view.y - halfHeight);
  const southeast = unproject(view.x + halfWidth, view.y + halfHeight);
  const sites = index({
    latitude: (northwest.lat + southeast.lat) / 2,
    longitude: (northwest.lng + southeast.lng) / 2,
    latitudeDelta: northwest.lat - southeast.lat,
    longitudeDelta: southeast.lng - northwest.lng,
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
