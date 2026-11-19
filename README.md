# Norman Flow

Expo SDK 58 / React Native / TypeScript app for ranking Norman road segments within each of eight wards. Screens follow the supplied pink Norman Flow references. Analysis, offline FAQ, imports, local persistence, map inspection and Excel export are implemented.

## Run

Use Node 22.13+, Node 24.3+ or another version supported by Expo SDK 58. The existing machine's Node 24.2 emits engine warnings.

```sh
npm install
npm run web
# or
npm start
```

A fresh install prepares road data with a visible startup progress screen, then opens Welcome. Approved base datasets load automatically from `assets/data/base/`; saved user uploads are restored too. If neither is available, analytical values remain empty. Home → Add new data & re-rank accepts CSV, XLSX, KML and KMZ. Review the preview, then confirm. Menu offers settings and undo of the last run.

```sh
npm test
npm run typecheck
npm run lint
npx expo export --platform all
```

Native dependencies require an SDK-compatible development build if your installed app binary does not include them. No signing, deployment, or native builds have been performed.

## Base data and uploaded files

Put approved raw datasets in [`assets/data/base/`](assets/data/base/README.md).
Use `Road_Segments.kmz`, `Norman_Traffic_AnalysisOCT22.xlsx`,
`Traffic_Project_OU_FALL_PROJECT.xlsx` and `pdicollisionsq-2016.xlsx` for the main
sources. All are optional; the linked guide covers additional years and ward files.
Restart Metro after adding/changing files. Metro discovers and bundles supported
files automatically for development and builds; no manual import list is required.

Menu separates **Base files** (included with the app) from **Uploaded files**
(saved on the device). Uploaded geometry overrides base layers; traffic years
accumulate and collision IDs merge. With no base files, uploads supply the analysis;
with neither, the app displays no data. Startup shows the actual restore/load/rank
stages and reports unreadable files without preventing use of available data.

## Maintain

- `AGENTS.md`: full feature behavior, rules, implementation notes and pending release checks.
- `src/analysis`: React Native-independent parsing, geometry, matching and ranks.
- `src/config`: header aliases, capacity table and local FAQ.
- `src/store`: Zustand, SQLite on native, IndexedDB on web.
- `src/app`: Expo Router screens.
- `assets/data/README.md`: instructions for adding the approved source assets.

The app never recommends projects, prices or fixes. Synthetic unit test records are not displayed in the UI. The current base contains the prepared Norman segment rankings and both GeoJSON map layers. The ACOG capacity PDF is bundled; the walkthrough video and optional shapefile remain pending. The AI chatbot (Beta) connects to the deployed chat proxy by default; no local environment file is required. Set `EXPO_PUBLIC_CHAT_PROXY_URL` to override it. See `proxy/README.md` for backend deployment and local testing. If the proxy is unavailable, the chatbot uses its built-in answers.
