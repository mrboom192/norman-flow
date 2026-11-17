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
  ]
    .filter(Boolean)
    .flatMap((name) => {
      // A single corridor in the prepared layer can span two named quadrants.
      const pair = name.match(/^(.*) (NE|NW|SE|SW)\/(NE|NW|SE|SW)$/);
      return pair
        ? [name, pair[1] + " " + pair[2], pair[1] + " " + pair[3]]
        : [name];
    });
}
export const sameRoad = (a: string, b: string) =>
  roadNames(a).some((n) => roadNames(b).includes(n));
