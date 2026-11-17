# Bundled base data

The current distribution is a **prepared segment snapshot**, not the raw workbooks described in the original competition brief. The CSV is authoritative for traffic maxima, audited facility capacity and segment collision totals. The two GeoJSON files provide geometry, stable keys, ward memberships and exclusion reasons. Fields duplicated in the map file are not added to the CSV figures. The app recomputes the ward lists from the joined measurements.

Restart Metro or run an Expo export after changing any base file. To regenerate the checked-in manifest directly, run `node scripts/prepare-base-data.cjs`. Commit the data and manifest together. The build includes these files and startup refreshes changed assets by hash; saved user uploads are retained.

Keep the three filenames below. Replace the trio together when geometry, eligibility or keys change. A metrics-only update can replace the CSV if the ranked key set, geometry metadata and statuses still agree. Validate with `npm test`. The legacy 333-segment KMZ is a parser test fixture, not this map.

There are no individual traffic stations, count years, collision case IDs, majority-ward percentages or lane coverage measurements in this release. Blank totals on map-only segments mean unknown, not zero. File totals are never replicated into synthetic cases. Adding raw traffic compares new matched volumes with the published maximum. When raw collision records are supplied, rankings use those case records instead of adding them to the summary totals: import the complete case history for the intended analysis. Removing the case upload restores the published totals. Raw uploaded geometry supersedes the base layer and disables summaries keyed to the replaced geometry.

## Source handoff notes

NORMAN FLOW APP DATA (City of Norman rules, Nov 15 2026) - 119 ranked of 375 segments

norman_flow_rankings.csv One row per RANKED segment (119). Join key: "key" (e.g. "12TH AVE NE/SE | 04").
road, from_street, to_street, miles ... where the segment is
volume ............. highest two-way count used (vehicles/day; collector-class counts left out)
facility, capacity . ACOG LOS E capacity used (lanes from City street data or a team aerial check)
vc ................. volume / capacity (1.0 or more = over capacity)
collisions ......... crashes on the segment, 2016-2026
ward_ranks ......... combined rank inside each ward it touches, e.g. "Ward 4:1; Ward 6:1"
city_*_rank ........ citywide V/C, collision and combined ranks (lower = higher priority)

norman_segments.geojson All 375 road segments as map lines (lon/lat, WGS84), same as Final_Segments.kmz.
Every segment: key, road, segment, from_street, to_street, wards, length_mi, lanes, ranked, status.
ranked = true -> the ranking fields from the CSV are attached.
ranked = false -> status says why: no usable count, or a collector road left out per the City (draw gray).

norman_wards.geojson The 8 City Council ward boundaries (polygons; ward, ward_num).

Keys changed from the old files (old "12TH AVE NE | 1" -> new "12TH AVE NE/SE | 04"): replace all three files together.
To update next year: rerun the Colab notebook or the Excel tool, then replace the CSV for a metrics-only update, or the complete trio if keys or eligibility changed.

### Crash map layers

`norman_crash_points.geojson` supplies recorded Point features for the map. The
app reads `[longitude, latitude]` and preserves accident, year, date, street,
cross_street, segment and on_study_segment. These points are a display source;
they do not replace or add to the published segment collision totals.

Layers offers separate **Crash locations** (original dots) and **Crash heatmap**
switches. The density layer sums equal-weight Gaussian kernels over nearby
crashes, using a radius of approximately 200 metres and yellow-to-dark-red
colors. Web draws the summed density in a small number of SVG paths and applies a
Gaussian blur; Google Maps uses
its native Heatmap, with a zoom-adjusted pixel radius constrained by that API.
Apple Maps uses the same density surface and blur as web.
The point layer uses one SVG path rather than thousands of native markers.

The ten segment markers use the CSV's published `city_combined_rank`, including
its ties, and sit halfway along each joined segment's geometry. These labels
are distinct from the application's recomputed sequential rankings. Existing
cached summary files are re-parsed to load the published marker ranks.

Native Google Maps credentials can be supplied through
`GOOGLE_MAPS_IOS_API_KEY` and `GOOGLE_MAPS_ANDROID_API_KEY` when building with
Expo/EAS. Without Google Maps configured, iOS retains Apple Maps with the SVG
density fallback. No generated native files are edited.
