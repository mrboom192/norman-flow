import JSZip from "jszip";
import { parser as createParser } from "sax";
import { length, lineString } from "@turf/turf";
import { Segment, Ward, Coordinate } from "../types";
import { normalizeRoad } from "../roads";

type Placemark = {
  name: string;
  description: string;
  fields: Record<string, string>;
  lines: Coordinate[][];
  polygons: Coordinate[][][];
  folder: string;
};
const localName = (name: string) => name.split(":").pop()!.toLowerCase();
const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// SAX keeps only the current placemark and coordinate token, never a full XML tree.
function placemarkParser(onPlacemark: (p: Placemark) => void) {
  const parser = createParser(true, { position: false });
  const stack: string[] = [],
    folders: string[] = [];
  let current: Placemark | undefined;
  let polygon: Coordinate[][] | undefined;
  let points: Coordinate[] | undefined;
  let coordinateToken = "";
  let fieldName = "";
  let fieldValue = "";
  function addCoordinate(token: string) {
    if (!token || !points) return;
    const values = token.split(",").map(Number);
    if (values.length >= 2 && values.every(Number.isFinite))
      points.push([values[1], values[0]]);
  }
  function readText(value: string) {
    const tag = stack[stack.length - 1];
    const parent = stack[stack.length - 2];
    if (tag === "coordinates" && points) {
      const tokens = (coordinateToken + value).split(/\s+/);
      coordinateToken = tokens.pop() ?? "";
      for (const token of tokens) addCoordinate(token);
    } else if (tag === "name" && parent === "folder") {
      folders[folders.length - 1] += value;
    } else if (current) {
      if (tag === "name" && parent === "placemark") current.name += value;
      else if (stack.includes("description")) current.description += value;
      else if ((tag === "value" && parent === "data") || tag === "simpledata")
        fieldValue += value;
    }
  }
  parser.ontext = readText;
  parser.oncdata = readText;
  parser.onopentag = (node) => {
    const tag = localName(node.name);
    stack.push(tag);
    if (tag === "folder") folders.push("");
    if (tag === "placemark")
      current = {
        name: "",
        description: "",
        fields: {},
        lines: [],
        polygons: [],
        folder: folders.join(" "),
      };
    if (!current) return;
    if (tag === "polygon") polygon = [];
    if (tag === "coordinates") {
      points = [];
      coordinateToken = "";
    }
    if (tag === "data" || tag === "simpledata") {
      fieldName = (node.attributes.name ?? "").toLowerCase();
      fieldValue = "";
    }
    if (tag === "br" && stack.includes("description"))
      current.description += "<br>";
  };
  parser.onclosetag = (name) => {
    const tag = localName(name);
    if (current) {
      if (tag === "coordinates" && points) {
        addCoordinate(coordinateToken);
        if (stack.includes("linearring") && polygon) polygon.push(points);
        else if (stack.includes("linestring")) current.lines.push(points);
        points = undefined;
        coordinateToken = "";
      }
      if (tag === "polygon" && polygon) {
        current.polygons.push(polygon);
        polygon = undefined;
      }
      if (tag === "data" || tag === "simpledata")
        current.fields[fieldName] = fieldValue.trim();
      if (tag === "tr" && stack.includes("description"))
        current.description += "<br>";
      if (tag === "placemark") {
        onPlacemark(current);
        current = undefined;
      }
    }
    if (tag === "folder") folders.pop();
    stack.pop();
  };
  return parser;
}

export async function parseKml(
  data: Uint8Array,
  source: string,
  onProgress?: (percent: number) => void,
) {
  const segments: Segment[] = [],
    wards: Ward[] = [];
  const parser = placemarkParser((placemark) => {
    const { name, folder } = placemark;
    if (placemark.polygons.length) {
      const ward = Number(
        name.match(/ward\D*(\d+)/i)?.[1] ?? name.match(/\d+/)?.[0],
      );
      if (ward >= 1 && ward <= 8)
        for (const rings of placemark.polygons)
          wards.push({ id: ward, source, rings });
      return;
    }
    const geometry = placemark.lines.flat();
    if (geometry.length < 2) return;
    const fields: Record<string, string> = {};
    for (const part of placemark.description.split(
      /<br\s*\/?\s*>|\n|<\/tr>/i,
    )) {
      const clean = part
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .trim();
      const split = clean.indexOf(":");
      if (split > 0)
        fields[clean.slice(0, split).trim().toLowerCase()] = clean
          .slice(split + 1)
          .trim();
    }
    Object.assign(fields, placemark.fields);
    const road = fields.road || name.split("|")[0].trim();
    const numbering =
      name.match(/\|\s*(\d+)\s+of\s+(\d+)/i) ??
      fields["segment within road"]?.match(/(\d+)\s+of\s+(\d+)/i);
    if (!numbering)
      throw new Error(
        `Segment numbering is missing for “${name}”. Expected ROAD | i of n | x mi.`,
      );
    const lane = fields["gis lane count"] ?? "";
    const laneMatch = lane.match(/\b(\d+)\s*(?:\(([\d.]+)%\))?/);
    const touched = Array.from(
      (fields["wards touched"] ?? fields["ward majority"] ?? "").matchAll(
        /\b[1-8]\b/g,
      ),
      (m) => Number(m[0]),
    );
    const facility = fields["acog facility category"] ?? "";
    const lengthMi =
      parseFloat(fields["segment length (miles)"]) ||
      length(lineString(geometry.map(([lat, lon]) => [lon, lat])), {
        units: "miles",
      });
    segments.push({
      id: `${normalizeRoad(road)}#${numbering[1]}`,
      road,
      index: Number(numbering[1]),
      of: Number(numbering[2]),
      lengthMi,
      roadTotalMi: parseFloat(fields["full road total (miles)"]) || lengthMi,
      geometry,
      start: geometry[0],
      end: geometry[geometry.length - 1],
      wards: [...new Set(touched)],
      wardMajority:
        Number(fields["ward majority"]?.match(/[1-8]/)?.[0]) || touched[0] || 0,
      lanes: laneMatch ? Number(laneMatch[1]) : null,
      laneCoverage: laneMatch
        ? Number(laneMatch[2] ?? (lane.includes("Not mapped") ? 0 : 100))
        : 0,
      travelDirection: fields["gis travel direction"] ?? "",
      facility,
      divided: /undivided/i.test(facility)
        ? false
        : /divided/i.test(facility)
          ? true
          : undefined,
      rankable: /\b03\b/.test(folder)
        ? false
        : /\b02\b/.test(folder)
          ? true
          : lengthMi >= 1,
      source,
      from: fields.from,
      to: fields.to,
    });
  });
  if (/\.kmz$/i.test(source)) {
    const zip = await JSZip.loadAsync(data);
    const names = Object.keys(zip.files)
      .filter((name) => !zip.files[name].dir && /\.kml$/i.test(name))
      .sort();
    // A standard KMZ's root document is authoritative; retain deterministic fallback.
    const name = names.find((name) => /^doc\.kml$/i.test(name)) ?? names[0];
    if (!name) throw new Error("The KMZ has no KML file.");
    await new Promise<void>((resolve, reject) => {
      // JSZip documents internalStream, but omits it from its ZipObject typings.
      const file = zip.files[name] as JSZip.JSZipObject & {
        internalStream(type: "string"): JSZip.JSZipStreamHelper<string>;
      };
      const stream = file.internalStream("string");
      let failed = false;
      let lastYield = Date.now();
      stream.on("data", (chunk, metadata) => {
        if (failed) return;
        try {
          parser.write(chunk);
          onProgress?.(Math.floor(metadata.percent));
          if (Date.now() - lastYield > 16) {
            stream.pause();
            setTimeout(() => {
              lastYield = Date.now();
              if (!failed) stream.resume();
            }, 0);
          }
        } catch (error) {
          failed = true;
          stream.pause();
          reject(error);
        }
      });
      stream.on("error", reject);
      stream.on("end", () => {
        if (!failed) resolve();
      });
      stream.resume();
    });
  } else {
    const decoder = new TextDecoder();
    for (let offset = 0; offset < data.length;) {
      let end = Math.min(offset + 64 * 1024, data.length);
      // Decode complete UTF-8 sequences without relying on native decoder streaming support.
      while (end < data.length && (data[end] & 0xc0) === 0x80) end--;
      if (end === offset) end = Math.min(offset + 64 * 1024, data.length);
      parser.write(decoder.decode(data.subarray(offset, end)));
      offset = end;
      onProgress?.(Math.floor((offset / data.length) * 100));
      await yieldToUI();
    }
  }
  parser.close();
  if (!segments.length && !wards.length)
    throw new Error("No road segments or numbered ward polygons were found.");
  return { segments, wards };
}
