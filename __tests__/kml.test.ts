import { expect, it, jest } from "@jest/globals";
import JSZip from "jszip";
import { parseKml } from "../src/analysis/parse/kml";

it("streams a large compressed coordinate list without requesting a whole XML string", async () => {
  const coordinates = Array.from(
    { length: 50000 },
    (_, i) => `${-97.5 + i / 10000000},35.2,0`,
  ).join(" ");
  const xml = `<kml><Document><Folder><name>03 RED</name><Placemark>
    <name>CAFÉ RD | 1 of 1 | 0.5 mi</name>
    <description><![CDATA[Road: CAFÉ RD<br>Segment length (miles): 0.5<br>Wards touched: 1, 2]]></description>
    <LineString><coordinates>${coordinates}</coordinates></LineString>
    </Placemark></Folder></Document></kml>`;
  const archive = new JSZip();
  archive.file("a-other.kml", "<kml/>");
  archive.file("doc.kml", xml);
  const bytes = await archive.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  const loadAsync = JSZip.loadAsync;
  const spy = jest
    .spyOn(JSZip, "loadAsync")
    .mockImplementation(async (data, options) => {
      const zip = await loadAsync(data, options);
      for (const file of Object.values(zip.files)) {
        // Reproduce a runtime that cannot allocate the entire decompressed string.
        file.async = (() => {
          throw new RangeError("String length exceeds limit");
        }) as typeof file.async;
      }
      return zip;
    });
  const progress: number[] = [];
  try {
    const result = await parseKml(bytes, "large.kmz", (percent) =>
      progress.push(percent),
    );
    expect(result.segments[0]).toMatchObject({
      road: "CAFÉ RD",
      wards: [1, 2],
      rankable: false,
    });
    expect(result.segments[0].geometry).toHaveLength(50000);
    expect(result.segments[0].end).toEqual([35.2, -97.5 + 49999 / 10000000]);
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.at(-1)).toBe(100);
  } finally {
    spy.mockRestore();
  }
});

it("preserves namespaced polygons, holes, folder eligibility and ExtendedData across KML chunks", async () => {
  const xml = `<k:kml xmlns:k="http://www.opengis.net/kml/2.2"><k:Document>
    <k:Folder><k:name>02 BLUE</k:name><k:Placemark><k:name>ROAD | 1 of 1 | 1 mi</k:name>
    <k:description><![CDATA[${" ".repeat(65500)}Road: Peña Rd<br>Segment length (miles): 1]]></k:description>
    <k:ExtendedData><k:Data name="Wards touched"><k:value>1, 8</k:value></k:Data><k:SchemaData><k:SimpleData name="GIS lane count">4 (75%)</k:SimpleData></k:SchemaData></k:ExtendedData>
    <k:LineString><k:coordinates>-97.5,35.2 -97.4,35.2</k:coordinates></k:LineString></k:Placemark></k:Folder>
    <k:Placemark><k:name>Ward 8</k:name><k:Polygon>
      <k:outerBoundaryIs><k:LinearRing><k:coordinates>-97.6,35.1 -97.3,35.1 -97.3,35.3 -97.6,35.1</k:coordinates></k:LinearRing></k:outerBoundaryIs>
      <k:innerBoundaryIs><k:LinearRing><k:coordinates>-97.5,35.15 -97.4,35.15 -97.4,35.2 -97.5,35.15</k:coordinates></k:LinearRing></k:innerBoundaryIs>
    </k:Polygon></k:Placemark></k:Document></k:kml>`;
  const result = await parseKml(
    new TextEncoder().encode(xml),
    "namespaced.kml",
  );
  expect(result.segments[0]).toMatchObject({
    road: "Peña Rd",
    wards: [1, 8],
    lanes: 4,
    laneCoverage: 75,
    rankable: true,
  });
  expect(result.wards[0].rings).toHaveLength(2);
});

it("rejects missing KML and malformed XML without returning a partial dataset", async () => {
  const zip = new JSZip();
  zip.file("image.png", "unused");
  await expect(
    parseKml(await zip.generateAsync({ type: "uint8array" }), "empty.kmz"),
  ).rejects.toThrow("no KML file");
  await expect(
    parseKml(new TextEncoder().encode("<kml><Placemark></kml>"), "broken.kml"),
  ).rejects.toThrow();
});
