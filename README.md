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

A fresh install opens Welcome. Source datasets are intentionally pending: all analytical values remain empty until files are imported. Home → Add new data & re-rank accepts CSV, XLSX, KML and KMZ. Review the preview, then confirm. Menu offers settings and undo of the last run.

```sh
npm test
npm run typecheck
npm run lint
npx expo export --platform all
```

Native dependencies require an SDK-compatible development build if your installed app binary does not include them. No signing, deployment, or native builds have been performed.

## Maintain

- `AGENTS.md`: full feature behavior, rules, implementation notes and pending release checks.
- `src/analysis`: React Native-independent parsing, geometry, matching and ranks.
- `src/config`: header aliases, capacity table and local FAQ.
- `src/store`: Zustand, SQLite on native, IndexedDB on web.
- `src/app`: Expo Router screens.
- `assets/data/README.md`: instructions for adding the approved source assets.

The app never recommends projects, prices or fixes. Synthetic unit test records are not displayed in the UI. Real datasets, source PDF, video, optional shapefile and final credits will be connected later.
