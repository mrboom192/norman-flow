import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { length, lineString } from "@turf/turf";
import { Segment, Ward, Coordinate } from "../types";
import { normalizeRoad } from "../roads";
type XmlElement = ReturnType<DOMParser["parseFromString"]>["documentElement"];
function text(node: NonNullable<XmlElement>, tag: string) {
  return node.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
}
function coords(value: string): Coordinate[] {
  return value
    .trim()
    .split(/\s+/)
    .map((v) => v.split(",").map(Number))
    .filter((p) => p.length >= 2 && p.every(Number.isFinite))
    .map(([lon, lat]) => [lat, lon]);
}
export async function parseKml(data: Uint8Array, source: string) {
  let xml: string;
  if (/\.kmz$/i.test(source)) {
    const zip = await JSZip.loadAsync(data);
    const file = Object.keys(zip.files)
      .sort()
      .find((n) => /\.kml$/i.test(n));
    if (!file) throw new Error("The KMZ has no KML file.");
    xml = await zip.files[file].async("string");
  } else xml = new TextDecoder().decode(data);
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const segments: Segment[] = [],
    wards: Ward[] = [];
  for (const placemark of Array.from(doc.getElementsByTagName("Placemark"))) {
    const name = text(placemark, "name");
    const polygons = Array.from(placemark.getElementsByTagName("Polygon"));
    if (polygons.length) {
      const ward = Number(
        name.match(/ward\D*(\d+)/i)?.[1] ?? name.match(/\d+/)?.[0],
      );
      if (ward >= 1 && ward <= 8)
        for (const polygon of polygons)
          wards.push({
            id: ward,
            source,
            rings: Array.from(polygon.getElementsByTagName("LinearRing")).map(
              (r) => coords(text(r, "coordinates")),
            ),
          });
      continue;
    }
    const lines = Array.from(placemark.getElementsByTagName("LineString"));
    if (!lines.length) continue;
    const geometry = lines.flatMap((l) => coords(text(l, "coordinates")));
    if (geometry.length < 2) continue;
    const desc = text(placemark, "description");
    const fields: Record<string, string> = {};
    for (const part of desc.split(/<br\s*\/?\s*>|\n|<\/tr>/i)) {
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
    for (const d of Array.from(placemark.getElementsByTagName("Data")))
      fields[(d.getAttribute("name") ?? "").toLowerCase()] = text(d, "value");
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
    let folder = "";
    let parent = placemark.parentNode;
    while (parent) {
      if (parent.nodeName === "Folder")
        folder += ` ${text(parent as NonNullable<XmlElement>, "name")}`;
      parent = parent.parentNode;
    }
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
  }
  if (!segments.length && !wards.length)
    throw new Error("No road segments or numbered ward polygons were found.");
  return { segments, wards };
}
