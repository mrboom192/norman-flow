import { create } from "zustand";
import { persist } from "zustand/middleware";
import Storage from "./storage";
import { createFlowStorage } from "./persistence";
import { Aliases } from "../analysis/parse/columns";
import {
  emptyInputs,
  Inputs,
  Results,
  Settings,
  RawRow,
} from "../analysis/types";
import { defaultSettings, runPipeline } from "../analysis/pipeline";
import { defaultPrimary } from "../theme/palette";
export type DatasetFile = {
  /** Older persisted files without a source are user uploads. */
  source?: "base" | "uploaded";
  baseVersion?: string;
  name: string;
  type: string;
  summary: string;
  data: Inputs;
  rawSheets?: Record<string, RawRow[]>;
  visible: boolean;
};
export function visibleGeometry(files: DatasetFile[]) {
  function layer<K extends "segments" | "wards">(key: K): Inputs[K] {
    const overridden = files.some(
      (f) => f.source !== "base" && f.data[key].length,
    );
    return files
      .filter((f) => f.visible && !(overridden && f.source === "base"))
      .flatMap((f) => f.data[key] as unknown[]) as Inputs[K];
  }
  return { segments: layer("segments"), wards: layer("wards") };
}
export function combine(files: DatasetFile[]): Inputs {
  const all = emptyInputs();
  const uploads = files.filter((f) => f.source !== "base");
  const hasSegments = uploads.some((f) => f.data.segments.length);
  const hasWards = uploads.some((f) => f.data.wards.length);
  // Base records come first so uploaded collision IDs take precedence.
  [...files.filter((f) => f.source === "base"), ...uploads].forEach((f) => {
    for (const key of ["segments", "wards", "traffic", "collisions"] as const)
      if (!(
        f.source === "base" &&
        ((key === "segments" && hasSegments) || (key === "wards" && hasWards))
      ))
        for (const row of f.data[key]) (all[key] as unknown[]).push(row);
  });
  const activeSummaries = files.filter(
    (f) => f.data.summaries && (!hasSegments || f.source !== "base"),
  );
  const rows =
    [...activeSummaries].reverse().find((f) => f.source !== "base") ??
    activeSummaries[activeSummaries.length - 1];
  if (rows) all.summaries = rows.data.summaries;
  all.segments = [...new Map(all.segments.map((s) => [s.id, s])).values()];
  all.traffic = [
    ...new Map(
      all.traffic.map((t) => [
        `${t.source}:${t.id}:${t.year}:${t.road}:${t.point?.join(",")}`,
        t,
      ]),
    ).values(),
  ];
  const collisions = new Map<string, Inputs["collisions"][number]>();
  all.collisions.forEach((c) => {
    const old = collisions.get(c.id);
    collisions.set(
      c.id,
      old
        ? {
            ...old,
            ...c,
            raw: { ...old.raw, ...c.raw },
            related: { ...old.related, ...c.related },
          }
        : c,
    );
  });
  all.collisions = [...collisions.values()];
  const crashFiles = files.filter((f) => f.data.crashPoints);
  const activeCrashes =
    [...crashFiles].reverse().find((f) => f.source !== "base") ??
    crashFiles[crashFiles.length - 1];
  if (activeCrashes) all.crashPoints = activeCrashes.data.crashPoints;
  return all;
}
type State = {
  hydrated: boolean;
  persistenceError: string | null;
  welcomeSeen: boolean;
  ward: number;
  dark: boolean;
  primary: string;
  files: DatasetFile[];
  results: Results | null;
  previous: {
    files: DatasetFile[];
    results: Results | null;
    settings: Settings;
  } | null;
  settings: Settings;
  aliases: Aliases;
  selected: string | null;
  mapReset: number;
  crashPointsVisible: boolean;
  crashHeatmapVisible: boolean;
  tour: number | null;
  set: (value: Partial<State>) => void;
  commit: (files: DatasetFile[]) => void;
  rerun: (settings: Settings) => void;
  undo: () => void;
  remove: (name: string) => void;
};
type SavedState = Pick<
  State,
  | "welcomeSeen"
  | "ward"
  | "dark"
  | "primary"
  | "files"
  | "results"
  | "previous"
  | "settings"
  | "aliases"
  | "crashPointsVisible"
  | "crashHeatmapVisible"
>;
export const flowStorage = createFlowStorage<SavedState>(Storage, (error) => {
  useFlow.setState({
    persistenceError: error instanceof Error ? error.message : String(error),
  });
});
export const useFlow = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      persistenceError: null,
      welcomeSeen: false,
      ward: 1,
      dark: false,
      primary: defaultPrimary,
      files: [],
      results: null,
      previous: null,
      settings: defaultSettings,
      aliases: {},
      selected: null,
      mapReset: 0,
      crashPointsVisible: false,
      crashHeatmapVisible: false,
      tour: null,
      set,
      commit: (files) => {
        const state = get();
        const results = runPipeline(
          combine(files),
          state.settings,
          new Date().toISOString(),
        );
        set({
          files,
          results,
          previous: {
            files: state.files,
            results: state.results,
            settings: state.settings,
          },
        });
      },
      rerun: (settings) => {
        const state = get();
        set({
          settings,
          results: runPipeline(
            combine(state.files),
            settings,
            new Date().toISOString(),
          ),
          previous: {
            files: state.files,
            results: state.results,
            settings: state.settings,
          },
        });
      },
      undo: () => {
        const prev = get().previous;
        if (prev) set({ ...prev, previous: null });
      },
      remove: (name) =>
        get().commit(
          get().files.filter((f) => f.source === "base" || f.name !== name),
        ),
    }),
    {
      name: "norman-flow-v1",
      skipHydration: true,
      storage: flowStorage,
      merge: (persisted, current) => {
        const saved = {
          ...(persisted as Partial<SavedState> & { colorblind?: boolean }),
        };
        delete saved.colorblind;
        return {
          ...current,
          ...saved,
          primary:
            !saved.primary || saved.primary.toLowerCase() === "#c2255c"
              ? defaultPrimary
              : saved.primary,
        };
      },
      partialize: (s) => ({
        welcomeSeen: s.welcomeSeen,
        ward: s.ward,
        dark: s.dark,
        primary: s.primary,
        files: s.files,
        results: s.results,
        previous: s.previous,
        settings: s.settings,
        aliases: s.aliases,
        crashPointsVisible: s.crashPointsVisible,
        crashHeatmapVisible: s.crashHeatmapVisible,
      }),
      onRehydrateStorage: () => (_state, error) => {
        useFlow.setState({
          hydrated: true,
          ...(error ? { persistenceError: String(error) } : {}),
        });
      },
    },
  ),
);
