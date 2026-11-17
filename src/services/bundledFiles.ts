import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { baseAssets } from "./base-assets.generated";

export type BundledFile = {
  name: string;
  label: string;
  module: number;
  mimeType: string;
};

/** The ACOG capacity table, a scanned fax (the typed values match it). */
export const acogPdf: BundledFile = {
  name: "ACOG Guidelines for Roadway Capacity vs. Number of Lanes.pdf",
  label: "ACOG capacity guidelines (PDF)",
  module: require("../../assets/data/base/ACOG Guidelines for Roadway Capacity vs. Number of Lanes.pdf"),
  mimeType: "application/pdf",
};

const mimeTypes: Record<string, string> = {
  csv: "text/csv",
  geojson: "application/geo+json",
  kmz: "application/vnd.google-earth.kmz",
  pdf: "application/pdf",
};

/** A bundled base data file by name, if this build includes it. */
export function bundledDataFile(name: string): BundledFile | undefined {
  const asset = baseAssets.find((a) => a.name === name);
  if (!asset) return undefined;
  return {
    name,
    label: name,
    module: asset.module,
    mimeType:
      mimeTypes[name.split(".").pop()!.toLowerCase()] ??
      "application/octet-stream",
  };
}

/** Open (web: new tab) or share/save (native) a file bundled with the app. */
export async function openBundledFile(file: BundledFile) {
  const asset = Asset.fromModule(file.module);
  if (Platform.OS === "web") {
    window.open(asset.uri, "_blank", "noopener");
    return;
  }
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error("The bundled file is unavailable.");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Opening files is unavailable on this device.");
  await Sharing.shareAsync(asset.localUri, {
    mimeType: file.mimeType,
    dialogTitle: file.label,
  });
}
