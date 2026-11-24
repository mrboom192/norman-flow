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

A fresh install prepares road data with a visible startup progress screen, then opens Welcome. Choose the short tour, take the detailed tour, or skip and replay either one later from Home or Menu. Approved base datasets load automatically from `assets/data/base/`; saved user uploads are restored too. If neither is available, analytical values remain empty. Home → Add new data & re-rank accepts CSV, XLSX, KML and KMZ. Review the preview, then confirm. Menu offers settings and undo of the last run.

```sh
npm test
npm run typecheck
npm run lint
npx expo export --platform all
```

Native dependencies require an SDK-compatible development build if your installed app binary does not include them. No signing, deployment, or native builds have been performed.

## Web layout and maps

Web windows 960 px and wider use desktop navigation, side-by-side overview
and chat panels, comparison columns in Rankings, and an inspection panel next
to the interactive map. Narrow web windows use the phone layout.

The road, ward, ranking and crash layers use the bundled analysis on web.
To enable Google street and satellite imagery on the interactive map, set
`EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` in an ignored `.env.local` file for local
development, or in the environment that builds the deployed site. Restart
Metro or rebuild after changing it. Enable the Maps JavaScript API and
billing in the Google Cloud project, and restrict the browser key to that API
and the web origins that will use it, including the local preview if needed.
Expo embeds public environment variables in the web bundle. Use a separate
browser key from the native Maps keys. If imagery is unavailable, the
interactive road, ward and heat layers still work.

The Home preview also uses the Google street basemap when configured.
On desktop web, the Layers panel lets you drag crash hotspots, road segments
and ward boundaries or use the up/down buttons. The top entry draws in front,
and the browser saves the order. Phone layouts and native apps use the default
order, with heat above roads and roads above ward boundaries. View crash
hotspots in **Heat → Hotspots**.

## Deploy to Netlify

The web build produces static pages for the app and each data detail route,
plus the bundled analysis files and favicon. It requires no application server.

### Upload a local build

1. From the project root, run `npm ci` and `npm run build:web`. The upload
   folder is `dist/netlify`.
2. Sign in to [Netlify Drop](https://app.netlify.com/drop) and drag in the
   `dist/netlify` folder. To update an existing manual deploy, drop the rebuilt
   folder on that site’s **Deploys** page.
3. To include Google imagery in a manual upload, set
   `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` in `.env.local` before building. Allow
   the site’s final hostname in the Maps JavaScript API key’s website
   restrictions. Rebuild and upload again if you change the key.

### Build from Git

Import the repository in Netlify. The root `netlify.toml` sets Node.js 22,
the build command `npm run build:web`, and the publish directory
`dist/netlify`. For Google imagery, add `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` to
the Netlify project's build environment and allow the site’s hostname in the
key’s restrictions. Trigger a new deploy after changing a build variable.

For AI chat on the deployed site, add the site's origin to the Cloudflare
Worker's `ALLOWED_ORIGINS` and redeploy the Worker. Set
`EXPO_PUBLIC_CHAT_PROXY_URL` before building if you use a different proxy.
Keep the Gemini API key in the Worker’s secrets. The app uses basic answers
when the proxy is unavailable. See [chat proxy setup](proxy/README.md).

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
