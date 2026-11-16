# Bundled base data

Put the approved, unmodified City source files directly in this folder (no subfolders).
All files are optional. Keep this README when the folder is empty.

| Content                                       | Preferred filename                            |
| --------------------------------------------- | --------------------------------------------- |
| Road segments and ward boundaries             | `Road_Segments.kmz`                           |
| Traffic counts, all available years           | `Norman_Traffic_AnalysisOCT22.xlsx`           |
| Collision records and related tables          | `Traffic_Project_OU_FALL_PROJECT.xlsx`        |
| Optional additional 2016 police records       | `pdicollisionsq-2016.xlsx`                    |
| Separate ward boundaries, if provided         | `Ward_Boundaries.kml`                         |
| Additional traffic year, if stored separately | `Traffic_Counts_FY2027.csv` (change the year) |

Use descriptive, stable filenames, preserve the original extension, and keep only
one current road layer and one ward layer. CSV, XLSX, XLS, KML and KMZ files are
automatically included. Content/headers determine the dataset kind, not the filename.
Do not add duplicates of sheets already present in another workbook. Spreadsheet
lock files beginning with `~$` are ignored. Do not add private/unapproved records:
these files ship to everyone who receives the app or opens the web build.

## Build and update

1. Copy the approved raw files here using the names above.
2. Restart Metro (`npm start` / `npm run web`) or run `npx expo export --platform all`.
   `metro.config.js` automatically regenerates `src/services/base-assets.generated.ts`
   with literal asset references and content hashes. No imports need to be edited.
   For inspection without starting Metro: `node scripts/prepare-base-data.cjs`.
3. Commit the source files and generated manifest together. Rebuild/publish the app
   to distribute changes; dropping files on a developer's disk cannot change an
   already installed app. Restart Metro after adding, deleting or changing a file.
4. Verify actual totals and diagnostics. Run `npm test`, `npm run typecheck` and
   `npm run lint`. Validate the final City geometry against 333 segments / 8 wards;
   those numbers are expectations, never seeded app values.

Startup uses the same raw-file parser and ranking pipeline as user imports. Parsed
base data is cached on the device using its content hash. A changed base asset is
parsed again; removed base assets are removed from the next analysis. Loading
errors are shown with the filename, and available uploads remain usable.

## Base files, uploads and no-data behavior

- Base files load automatically without asking staff to import them.
- Saved user uploads are restored on startup, even if this folder is empty.
- Uploaded road and ward layers override the corresponding base layer. Removing
  an uploaded layer restores the available base layer. Base files remain listed
  separately in Menu and are maintained through the app build, not removed there.
- Traffic counts accumulate across base and uploaded sources/years. Collision IDs
  deduplicate, with uploaded records taking precedence. Highest-volume and ranking
  rules remain unchanged. Replacing/removing uploads retains the existing undo flow.
- No base files and no saved uploads means no data: empty screens, no fabricated
  counts or rankings. Partial inputs remain usable and diagnostics explain records
  that cannot be matched.
- Older saved files with no source marker are treated as user uploads.

PDFs, walkthrough videos and shapefiles are **not** pipeline inputs and are not
loaded from this folder. Capacity values remain in `src/config/capacity.json`.
Connect the source PDF/video separately when approved; shapefiles still require
explicit reprojection/import support.
