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
  laneCoverage: number | null;
  preparedStatus?: string;
  publishedRanked?: boolean;
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
  summarySource?: string;
  laneSource?: string;
  maxVolume?: number;
  volumeYear?: number;
  capacity?: number;
  vc?: number;
  collisions: number | null;
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
export type SegmentSummary = {
  id: string;
  /** Full-precision V/C from the results file (volume ÷ capacity). */
  vc: number;
  /** Official combined rank in each ward the segment touches. */
  wardRanks: Record<number, number>;
  cityVcRank?: number;
  cityCollisionRank?: number;
  cityCombinedRank?: number;
  volume: number;
  collisions: number;
  capacity: number;
  facility: string;
  laneSource: string;
  source: string;
};
export type Inputs = {
  crashPoints?: CrashPoint[];
  summaries?: SegmentSummary[];
  segments: Segment[];
  wards: Ward[];
  traffic: Traffic[];
  collisions: Collision[];
};
/** Observed crash coordinates for display; never re-count these as raw collisions. */
export type CrashPoint = {
  id: string;
  point: Coordinate;
  year: number;
  date: string;
  street: string;
  crossStreet: string;
  segment: string;
  onStudySegment: boolean;
  source: string;
};
export type Settings = {
  matchDistance: number;
  laneOverrides: Record<string, number>;
  capacities: CapacityTable;
};
export type Results = {
  rankingVersion?: number;
  /** True when every ranked value comes unchanged from the official results file. */
  official?: boolean;
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
