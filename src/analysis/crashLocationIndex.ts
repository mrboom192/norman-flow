import type { CrashPoint } from "./types";

export type CrashViewport = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  width: number;
  height: number;
};

type Site = { id: string; latitude: number; longitude: number; count: number };
const longitudeScale = Math.cos((35.22 * Math.PI) / 180);

// Fixed geographic cells keep clusters stable while the camera moves.
// Cache recent zoom levels so pans query just the cells around the screen.
export function createCrashLocationIndex(points: CrashPoint[]) {
  const levels = new Map<number, Map<number, Map<number, Site>>>();
  return (view: CrashViewport) => {
    if (!(
      view.width > 0 &&
      view.height > 0 &&
      view.longitudeDelta > 0 &&
      view.latitudeDelta > 0
    ))
      return [];
    const unitsPerPixel = Math.max(
      (view.longitudeDelta * longitudeScale) / view.width,
      view.latitudeDelta / view.height,
    );
    const cell = 2 ** Math.ceil(Math.log2(unitsPerPixel * 44));
    const lonCell = cell / longitudeScale;
    let rows = levels.get(cell);
    if (!rows) {
      rows = new Map();
      for (const {
        point: [lat, lon],
      } of points) {
        const y = Math.floor(lat / cell),
          x = Math.floor(lon / lonCell);
        let row = rows.get(y);
        if (!row) {
          row = new Map();
          rows.set(y, row);
        }
        const site = row.get(x);
        if (site) {
          site.count++;
          site.latitude += (lat - site.latitude) / site.count;
          site.longitude += (lon - site.longitude) / site.count;
        } else
          row.set(x, {
            id: cell + "/" + y + "/" + x,
            latitude: lat,
            longitude: lon,
            count: 1,
          });
      }
      if (levels.size >= 4) levels.delete(levels.keys().next().value!);
      levels.set(cell, rows);
    }
    const x0 =
      Math.floor((view.longitude - view.longitudeDelta / 2) / lonCell) - 1;
    const x1 =
      Math.floor((view.longitude + view.longitudeDelta / 2) / lonCell) + 1;
    const y0 = Math.floor((view.latitude - view.latitudeDelta / 2) / cell) - 1;
    const y1 = Math.floor((view.latitude + view.latitudeDelta / 2) / cell) + 1;
    const visible: Site[] = [];
    for (let y = y0; y <= y1; y++) {
      const row = rows.get(y);
      if (!row) continue;
      for (let x = x0; x <= x1; x++) {
        const site = row.get(x);
        if (site) visible.push(site);
      }
    }
    return visible;
  };
}
