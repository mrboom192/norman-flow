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
  CapacityPreset,
} from "../analysis/types";
import { defaultSettings, runPipeline } from "../analysis/pipeline";
import { officialPresetId } from "../analysis/capacity";
import { defaultPrimary } from "../theme/palette";
export type DatasetFile = {
  /** Older persisted files without a source are user uploads. */
  source?: "base" | "uploaded";
  baseVersion?: string;
  /** When an uploaded file was imported (ISO date). */
  importedAt?: string;
  /** Parser version that produced `data` (see preparedParserVersion). */
  parserVersion?: number;
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
  /** User-created LOS E capacity presets (the official preset is built in). */
  capacityPresets: CapacityPreset[];
  selected: string | null;
  mapReset: number;
  crashPointsVisible: boolean;
  tour: number | null;
  set: (value: Partial<State>) => void;
  commit: (files: DatasetFile[]) => void;
  rerun: (settings: Settings) => void;
  undo: () => void;
  /** Drop uploads and setting overrides, rerunning on the bundled official files. */
  restoreOfficial: () => void;
  /**
   * Menu's destructive Reset map: delete every added file and capacity
   * override, return to the bundled official results, and reset the map view.
   * Unlike restoreOfficial it keeps no undo copy.
   */
  resetMap: () => void;
  /** Create or update a custom preset; reruns if it is the active one. */
  savePreset: (preset: CapacityPreset) => void;
  deletePreset: (id: string) => void;
  /** Rank with a preset's capacities ("official" returns to the official view). */
  applyPreset: (id: string) => void;
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
  | "capacityPresets"
  | "crashPointsVisible"
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
      capacityPresets: [],
      selected: null,
      mapReset: 0,
      crashPointsVisible: false,
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
      restoreOfficial: () => {
        const state = get();
        const files = state.files.filter((f) => f.source === "base");
        // Lane and capacity overrides would change official values; keep only
        // the match distance, which official results don't use.
        const settings = {
          ...defaultSettings,
          matchDistance: state.settings.matchDistance,
        };
        set({
          files,
          settings,
          results: runPipeline(
            combine(files),
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
      resetMap: () => {
        get().restoreOfficial();
        set({
          previous: null,
          selected: null,
          mapReset: get().mapReset + 1,
        });
      },
      savePreset: (preset) => {
        if (preset.id === officialPresetId)
          throw new Error(
            "The official preset can't be changed. Use Save as new.",
          );
        const state = get();
        const capacityPresets = [
          ...state.capacityPresets.filter((p) => p.id !== preset.id),
          preset,
        ];
        set({ capacityPresets });
        if (state.settings.capacityPreset?.id === preset.id)
          get().rerun({ ...state.settings, capacityPreset: preset });
      },
      deletePreset: (id) => {
        const state = get();
        set({
          capacityPresets: state.capacityPresets.filter((p) => p.id !== id),
        });
        if (state.settings.capacityPreset?.id === id)
          get().applyPreset(officialPresetId);
      },
      applyPreset: (id) => {
        const state = get();
        const preset =
          id === officialPresetId
            ? undefined
            : state.capacityPresets.find((p) => p.id === id);
        if (id !== officialPresetId && !preset)
          throw new Error("That capacity preset no longer exists.");
        get().rerun({ ...state.settings, capacityPreset: preset });
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
              : // The old green failed text contrast; use its darker replacement.
                saved.primary.toLowerCase() === "#1a8f26"
                ? "#188523"
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
        capacityPresets: s.capacityPresets,
        crashPointsVisible: s.crashPointsVisible,
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
