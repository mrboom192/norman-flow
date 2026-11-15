export type Coordinate = [number, number]; // latitude, longitude
export type RawRow = Record<string, unknown>;
export type Segment = {
  id: string;
  road: string;
  index: number;
  of: number;
  lengthMi: number;
  roadTotalMi: number;
  wards: number[];
  wardMajority: number;
  start: Coordinate;
  end: Coordinate;
  geometry: Coordinate[];
  lanes: number | null;
  laneCoverage: number;
  travelDirection: string;
  facility?: string;
  divided?: boolean;
  rankable: boolean;
  source: string;
  from?: string;
  to?: string;
};
export type Ward = { id: number; rings: Coordinate[][]; source: string };
export type Traffic = {
  id: string;
  road: string;
  point?: Coordinate;
  volume?: number;
  year?: number;
  source: string;
  raw: RawRow;
};
export type Collision = {
  id: string;
  road: string;
  crossRoad: string;
  point?: Coordinate;
  fromAt: string;
  distanceFt: number;
  direction: string;
  year?: number;
  source: string;
  raw: RawRow;
  related: Record<string, RawRow[]>;
};
export type SegmentResult = Segment & {
  maxVolume?: number;
  volumeYear?: number;
  capacity?: number;
  vc?: number;
  collisions: number;
  vcRank?: number;
  collisionRank?: number;
  combinedScore?: number;
  combinedRank?: number;
  flags: string[];
};
export type Unmatched = {
  kind: "Traffic" | "Collision";
  id: string;
  road: string;
  source: string;
  reason: string;
  raw: RawRow;
};
export type RankKind = "combined" | "vc" | "collisions";
export type CapacityTable = Record<string, { c: number; e: number }>;
export type Inputs = {
  segments: Segment[];
  wards: Ward[];
  traffic: Traffic[];
  collisions: Collision[];
};
export type Settings = {
  matchDistance: number;
  laneOverrides: Record<string, number>;
  capacities: CapacityTable;
};
export type Results = {
  runAt: string;
  segments: SegmentResult[];
  wards: Record<number, Record<RankKind, SegmentResult[]>>;
  unmatched: Unmatched[];
  diagnostics: {
    countsMatched: number;
    countsUnmatched: number;
    collisionsMatched: number;
    collisionsUnmatched: number;
    laneChecks: number;
  };
  settings: Settings;
  sources: string[];
};
export const emptyInputs = (): Inputs => ({
  segments: [],
  wards: [],
  traffic: [],
  collisions: [],
});
