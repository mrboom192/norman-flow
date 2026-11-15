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
export type DatasetFile = {
  name: string;
  type: string;
  summary: string;
  data: Inputs;
  rawSheets?: Record<string, RawRow[]>;
  visible: boolean;
};
export function combine(files: DatasetFile[]): Inputs {
  const all = emptyInputs();
  files.forEach((f) => {
    for (const key of ["segments", "wards", "traffic", "collisions"] as const)
      for (const row of f.data[key]) (all[key] as unknown[]).push(row);
  });
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
  return all;
}
type State = {
  hydrated: boolean;
  persistenceError: string | null;
  welcomeSeen: boolean;
  ward: number;
  dark: boolean;
  colorblind: boolean;
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
  | "colorblind"
  | "primary"
  | "files"
  | "results"
  | "previous"
  | "settings"
  | "aliases"
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
      colorblind: false,
      primary: "#C2255C",
      files: [],
      results: null,
      previous: null,
      settings: defaultSettings,
      aliases: {},
      selected: null,
      mapReset: 0,
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
        get().commit(get().files.filter((f) => f.name !== name)),
    }),
    {
      name: "norman-flow-v1",
      storage: flowStorage,
      partialize: (s) => ({
        welcomeSeen: s.welcomeSeen,
        ward: s.ward,
        dark: s.dark,
        colorblind: s.colorblind,
        primary: s.primary,
        files: s.files,
        results: s.results,
        previous: s.previous,
        settings: s.settings,
        aliases: s.aliases,
      }),
      onRehydrateStorage: () => (state) => state?.set({ hydrated: true }),
    },
  ),
);
