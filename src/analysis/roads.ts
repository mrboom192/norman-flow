export const normalizeRoad = (road: string) =>
  road
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/(\d+)\s+(ST|ND|RD|TH)\b/g, "$1$2")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/\s+/g, " ")
    .trim();
export function roadNames(road: string) {
  return [
    normalizeRoad(road.replace(/\([^)]*\)/g, "")),
    ...Array.from(road.matchAll(/\(([^)]+)\)/g), (m) => normalizeRoad(m[1])),
  ].filter(Boolean);
}
export const sameRoad = (a: string, b: string) =>
  roadNames(a).some((n) => roadNames(b).includes(n));
