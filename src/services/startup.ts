import { rankingVersion } from "../analysis/rankings";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { baseAssets } from "./base-assets.generated";
import { validateJoin } from "../analysis/prepared";
import { parseFile } from "./files";
import { combine, DatasetFile, flowStorage, useFlow } from "../store/useFlow";
import { runPipeline } from "../analysis/pipeline";

export type StartupProgress = { step: number; message: string };
export const startupSteps = [
  "Restore saved files",
  "Load base road data",
  "Prepare ward rankings",
];
export const paintStartup = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
let startup: Promise<string[]> | undefined;

// A single startup operation also handles React Strict Mode remounts.
export function initializeData(report: (progress: StartupProgress) => void) {
  return (startup ??= load(report));
}
async function load(
  report: (progress: StartupProgress) => void,
): Promise<string[]> {
  const issues: string[] = [];
  const progress = async (step: number, message: string) => {
    report({ step, message });
    await paintStartup();
  };
  await progress(0, "Restoring files saved on this device…");
  await useFlow.persist.rehydrate();
  const saved = useFlow.getState();
  if (saved.persistenceError)
    issues.push(`Saved files could not be restored: ${saved.persistenceError}`);
  const files: DatasetFile[] = [];
  await progress(
    1,
    baseAssets.length
      ? "Checking the included base files…"
      : "No base files included. Checking your uploads…",
  );
  for (const [index, asset] of baseAssets.entries()) {
    await progress(
      1,
      `Loading base file ${index + 1} of ${baseAssets.length} · ${asset.name}`,
    );
    const cached = saved.files.find(
      (f) =>
        f.source === "base" &&
        f.name === asset.name &&
        f.baseVersion === asset.version &&
        // Older parsed summaries omitted the published marker rank.
        (!f.data.summaries?.length ||
          f.data.summaries.some((r) => r.cityCombinedRank !== undefined)),
    );
    if (cached) {
      files.push(cached);
      continue;
    }
    try {
      const resource = Asset.fromModule(asset.module);
      let bytes: Uint8Array;
      if (Platform.OS === "web") {
        const response = await fetch(resource.uri);
        if (!response.ok)
          throw new Error(`Unable to read file (${response.status}).`);
        bytes = new Uint8Array(await response.arrayBuffer());
      } else {
        await resource.downloadAsync();
        if (!resource.localUri)
          throw new Error("The bundled file is unavailable.");
        bytes = await new File(resource.localUri).bytes();
      }
      const parsed = await parseFile(
        { name: asset.name, bytes },
        saved.aliases,
        undefined,
        (percent) =>
          report({ step: 1, message: `Reading ${asset.name} · ${percent}%` }),
      );
      files.push({ ...parsed, source: "base", baseVersion: asset.version });
    } catch (error) {
      issues.push(
        `${asset.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  // A partially replaced bundle must not publish stale or cross-joined ranks.
  for (const file of [...files]) {
    if (!file.data.summaries) continue;
    try {
      validateJoin(
        files.flatMap((f) => f.data.segments),
        file.data.summaries,
      );
    } catch (error) {
      issues.push(
        file.name +
          ": " +
          (error instanceof Error ? error.message : String(error)),
      );
      files.splice(files.indexOf(file), 1);
    }
  }
  files.push(...saved.files.filter((f) => f.source !== "base"));
  await progress(
    2,
    files.length
      ? "Preparing road segments and ward rankings…"
      : "No data yet. Preparing your workspace…",
  );
  const changed =
    files.length !== saved.files.length ||
    files.some((f, i) => f !== saved.files[i]);
  // Reuse the saved analysis when the bundled assets and uploads are unchanged.
  if (
    changed ||
    (files.length > 0 &&
      (!saved.results || saved.results.rankingVersion !== rankingVersion))
  ) {
    const results = files.length
      ? runPipeline(combine(files), saved.settings, new Date().toISOString())
      : null;
    useFlow.setState({ files, results, previous: null });
    await progress(2, "Saving the prepared analysis on this device…");
    try {
      await flowStorage.flush();
    } catch (error) {
      issues.push(
        `The analysis is ready, but could not be saved: ${String(error)}`,
      );
    }
  }
  return issues;
}
