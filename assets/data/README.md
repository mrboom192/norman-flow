# Source data — pending

The City datasets are still being prepared. No invented sample rankings are shipped.
Use Home → Add new data & re-rank to load final CSV/XLSX/KML/KMZ files.

When approved files arrive, put the source files here and add a bundled-asset bootstrap using the same `parseFile` → `combine` → `runPipeline` path. Do not create a separate precomputed-results path. Run the real-data acceptance test for 333 segments and 8 wards before enabling automatic first-launch import.

Pending assets: Road_Segments.kmz; traffic workbook; collision workbook; 2016 police export; ACOG source PDF; walkthrough video. The ODOT shapefile is optional and requires EPSG:32124 → WGS84 reprojection before integration.

Synthetic records in `__tests__` test geometry and rank rules only. They are never loaded into the app.
