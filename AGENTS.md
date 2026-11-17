This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# Norman Flow – Build Instructions (React Native + Expo)

Nov 14, 2026 · @awa

## 1. Agent brief

Build **Norman Flow**, a React Native + Expo app that turns the City of Norman's raw traffic, collision and road-segment files into **8 ranked lists of road segments, one per city ward**. It is the team's entry for the OU MIS Data Analytics Case Competition; City staff will reuse it to rerun the analysis when new data arrives.

**Users:** City of Norman transportation staff and competition judges. Assume they are not programmers.

**Design reference:** the [Norman Flow design canvas](https://claude.ai/artifact/P2LHhV8uYdaQPPiEfRf8yb) has six screens: Welcome, Home, Search (map), Rankings, Chatbot and Menu. Match its layout, copy and colors. Section 6 describes each screen in words.

**Hard rules for the agent**

- The app outputs **ranked lists only**. It never recommends projects, costs or fixes.
- Never invent or hard-code results. Every rank, V/C ratio and collision count comes from the pipeline in section 4. Show an em dash (—) until a value is computed.
- The whole analysis must rerun from the raw files with no manual cleaning. Column names and order will change between years, so map columns by aliases (section 3), not by position.
- Keep the analysis code free of React Native imports so it runs in Node and in unit tests.
- Rankings must be exportable to Excel (.xlsx). The City already works in macro-enabled Excel.
- When a rule here is unclear, stop and list it under Open questions (section 8) instead of guessing.

## 2. Tech stack and setup

Use the current stable Expo SDK with TypeScript and Expo Router, targeting iOS, Android and web. Start with `npx create-expo-app@latest norman-flow` and check each library below against that SDK with `npx expo install`, not hand-picked versions.

| Need             | Library                                              | Notes                                                                                   |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Navigation       | expo-router                                          | Tabs layout: Home, Search, Ranks, Chatbot, Menu; Welcome as a modal                     |
| Map              | react-native-maps                                    | Polylines for segments, polygons for wards; on web use react-native-svg drawing instead |
| Drawing          | react-native-svg                                     | Map fallback, icons, logo                                                               |
| File import      | expo-document-picker, expo-file-system               | Accept .xlsx, .csv, .kml, .kmz                                                          |
| Excel read/write | xlsx (SheetJS)                                       | Parse inputs, export rankings                                                           |
| KML / KMZ        | jszip, @xmldom/xmldom, @tmcw/togeojson               | Unzip KMZ, parse to GeoJSON                                                             |
| Geometry         | @turf/turf                                           | Point-to-line distance, offsets along a line, point in polygon                          |
| State            | zustand                                              | One store for datasets, results and settings                                            |
| Storage          | expo-sqlite or AsyncStorage                          | Keep the last imported data and results on the device                                   |
| Share / export   | expo-sharing                                         | Hand the exported .xlsx to Mail, Files or Drive                                         |
| Fonts            | @expo-google-fonts/fredoka, @expo-google-fonts/inter | Headings / body                                                                         |
| Video            | expo-video                                           | "How to use the app" walkthrough                                                        |
| Tests            | jest (jest-expo preset)                              | Run the analysis on the sample files                                                    |

**Folder structure**

```
app/
  _layout.tsx          root stack; shows Welcome on first launch
  welcome.tsx          modal
  (tabs)/_layout.tsx   bottom tab bar
  (tabs)/index.tsx     Home
  (tabs)/search.tsx    Map + segment details
  (tabs)/ranks.tsx     Rankings
  (tabs)/chat.tsx      Chatbot
  (tabs)/menu.tsx      Files, Resources, Settings, Credits
src/
  analysis/            pure TypeScript, no React Native imports
    parse/             kml.ts, traffic.ts, collisions.ts, columns.ts
    segments.ts        segment model + ward assignment
    capacity.ts        ACOG table + lane lookup
    matchTraffic.ts    traffic count -> segment
    matchCollisions.ts collision -> segment
    rank.ts            per-ward rankings
    pipeline.ts        runs everything, returns Results
  components/          WardPicker, SegmentRow, StatTile, MapView, TabBar
  store/               zustand store
  theme/               colors.ts, type.ts
  config/              columnAliases.json, capacity.json
assets/data/           the provided sample files, bundled for first launch
__tests__/
```

## 3. Data inputs

The app reads five kinds of input. Bundle the provided files in `assets/data/` as the default dataset, and let users replace any of them from Home or the map.

| File                                                                                      | What it holds                                                                                           | Key fields                                                                                                                                                                                                                                                                                 | Parsing notes                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Road_Segments.kmz                                                                         | 8 ward polygons; 321 road segments ≥ 1 mi (folder "02 … BLUE") and 12 shorter roads (folder "03 … RED") | Placemark name `ROAD \| i of n \| x mi`; description fields: Road, Segment length (miles), Full road total (miles), Segment within road, Ward majority, Wards touched, Start/End latitude/longitude, GIS lane count, GIS travel direction, ACOG facility category, Classification coverage | Unzip, parse KML. Split the description on `<br>` into `key: value` pairs. Lane count can read `4 (59.4%); Not mapped (40.6%)`: keep the number and the coverage %                                                         |
| Norman_Traffic_AnalysisOCT22.xlsx                                                         | City traffic counts for FY19, FY21, FY23, FY25, FY26 (about 100 each, 500 total)                        | Raw sheets: road (On / ON_ROAD), From, To, Latitude, Longitude, count. Sheet Traffic_Combined is already normalized: Source_Year, Loc_ID, Road_Name, From, To, Latitude, Longitude, Traffic_Volume, Count_Date, Source_File                                                                | Prefer the Raw_FY sheets so new years work. Counts may be text like `NB 2,009vpd - 55mph / SB 1,889vpd - 61mph (3/31/23)`: sum the vpd numbers for both directions                                                         |
| Traffic_Project_OU_FALL_PROJECT.xlsx (same tables in the traffic workbook's Raw\_ sheets) | 23,595 collision records, 2016 to 2026                                                                  | Base_Data: Year, AccidentNumber, AccidentDatetime, From_At (At / From), Direction (e.g. DirectionSouth), Distance (feet, zero-padded "0035"), StreetPrefix, StreetName, StreetType, StreetSuffix, XStreet… (cross street), Lat, Lon, CauseCode                                             | Other sheets join on AccidentNumber: NumOfVehicles, Unit_Type, VehConfiguration, Road_Surface, Vehicle_Occupants, OP_Used. vsCODES maps numeric codes to descriptions. Keep every column: do not drop data during cleaning |
| pdicollisionsq-2016.xlsx                                                                  | 2016 police export, one row per vehicle unit                                                            | CaseNumber, street fields, UnitNumber, UnitType, ContributingFactors                                                                                                                                                                                                                       | Deduplicate on CaseNumber before counting                                                                                                                                                                                  |
| ACOG capacity guidelines (PDF)                                                            | Daily capacity by facility type                                                                         | See table below                                                                                                                                                                                                                                                                            | Store as `config/capacity.json`, editable without code changes                                                                                                                                                             |
| odot_aadtc shapefile (EPSG:32124)                                                         | ODOT traffic count stations                                                                             | AADT per station                                                                                                                                                                                                                                                                           | Optional extra source; reproject to WGS84 before use                                                                                                                                                                       |

**ACOG capacities (vehicles per day).** V/C uses the LOS E column.

| Facility type                      | LOS C (2020 plan) | LOS E (2025 plan) |
| ---------------------------------- | ----------------- | ----------------- |
| 2-lane arterial                    | 10,000            | 17,100            |
| 4-lane arterial, undivided         | 22,000            | 34,200            |
| 4-lane arterial, divided           | 26,000            | 38,000            |
| 5-lane arterial (center turn lane) | 24,000            | 36,000            |
| 6-lane arterial, undivided         | 32,000            | 52,300            |
| 6-lane arterial, divided           | 40,000            | 58,000            |
| One-way street, per lane           | 6,000             | 11,000            |
| 4-lane expressway                  | 52,000            | 80,000            |
| 6-lane expressway                  | 78,000            | 125,000           |
| 8-lane expressway                  | 104,000           | 165,000           |

**Column aliases.** Keep a `config/columnAliases.json` that maps each field the pipeline needs to the header names seen so far, matched case- and space-insensitively. Example: road = On, ON_ROAD, Road_Name, StreetName; volume = Latest, LATEST_COUNT, NEW COUNT, Traffic_Volume, Column1. If a required field is missing, show a screen that lets the user pick the column, then save that choice to the aliases file.

## 4. Analysis pipeline

The pipeline turns the inputs into three ranked lists per ward: V/C, collisions and combined. Implement it in `src/analysis/pipeline.ts` as one function, `runPipeline(inputs): Results`. It must be deterministic: same files in, same rankings out.

1. **Load segments.** Read every segment from the KMZ. ID = road + segment number (e.g. `W ROBINSON ST#2`). Keep length, start/end points, geometry, lane count, lane coverage % and travel direction. Use folder 02 (≥ 1 mi) for ranking; show folder 03 roads on the map only.
2. **Assign wards.** Use "Wards touched" from the KMZ. When a new ward file is loaded, recompute it with point-in-polygon / line intersection. A segment that touches two wards goes in **both** wards' lists (City rule).
3. **Pick capacity.** Map lane count + divided/undivided + one-way to a row of `capacity.json` and take LOS E. Flag segments whose lane coverage is under 100% with "Check aerial view". Let staff override lanes per segment; save overrides and reapply them on every rerun.
4. **Match traffic counts to segments.** Normalize road names (uppercase; strip periods; NE/NW/SE/SW and E/W prefixes kept as separate tokens; Ave/Avenue → AVE, Rd/Road → RD, St/Street → ST; "48 th" → 48TH; a name in parentheses is an alias, so try both). A count matches a segment when the names agree and the count point is within 150 m of the segment line; nearest segment wins. Make the 150 m a setting.
5. **Take the highest volume.** If a segment has counts from several years, use the highest one (City rule: 18,000 in 2019 and 20,000 in 2025 → use 20,000). Keep the year it came from.
6. **Compute V/C.** V/C = highest volume ÷ LOS E capacity, to 2 decimals. Segments with no count get no V/C and drop out of every list.
7. **Place each collision.** Deduplicate on AccidentNumber / CaseNumber. The road it happened on is StreetName; the reference intersection is StreetName × XStreetName.
   - `At`: the collision is at the intersection. Assign it to the StreetName segment nearest the intersection.
   - `From`: start at the intersection, move Distance feet in Direction (North/South/East/West) along the StreetName line, then assign it to the StreetName segment containing that point. Example from the brief: coded at Franklin Rd & 48th Ave NE, 1,000 ft north → it belongs to 48th Ave NE.
   - Find the intersection from the two roads' segment geometries. Use the record's Lat/Lon only as a fallback: the City thinks those may just be the nearest intersection.
8. **Drop unmatched collisions.** A collision that lands on no segment, or on a segment with no traffic count, does not count in rankings (City hint). Keep these in an "Unmatched" list with the reason, so staff can review them.
9. **Rank each ward.** Do this for all 8 wards:
   - V/C list: segments with a V/C, highest first.
   - Collision list: segments with a traffic count, most collisions first.
   - Combined list: only segments with both. Score = V/C rank + collision rank (2nd in collisions + 4th in V/C = 6). Lowest score first.
   - Ties share a rank (1, 2, 2, 4). Break combined ties by higher V/C.
10. **Return results.** Return per-ward lists, segment details and diagnostics: counts matched/unmatched, collisions matched/unmatched, segments flagged for lane checks.

**Core types**

```ts
type Segment = {
  id: string;
  road: string;
  index: number;
  of: number;
  lengthMi: number;
  roadTotalMi: number;
  wards: number[];
  wardMajority: number;
  start: [number, number];
  end: [number, number]; // [lat, lon]
  geometry: [number, number][];
  lanes: number | null;
  laneCoverage: number;
  travelDirection: string;
};
type SegmentResult = Segment & {
  maxVolume?: number;
  volumeYear?: number;
  capacity?: number;
  vc?: number;
  collisions: number;
  vcRank?: number;
  collisionRank?: number;
  combinedScore?: number;
  combinedRank?: number;
  flags: string[];
};
type Results = {
  runAt: string;
  wards: Record<
    number,
    {
      vc: SegmentResult[];
      collisions: SegmentResult[];
      combined: SegmentResult[];
    }
  >;
  diagnostics: {
    countsUnmatched: number;
    collisionsUnmatched: number;
    laneChecks: number;
  };
};
```

**Tests.** Run the pipeline on the bundled files in jest. Assert that there are 333 segments and 8 wards; that no ranked segment lacks a volume; and that every combined score equals V/C rank + collision rank. Add one test for the 48th Ave NE example.

## 5. Design system

The app is soft pink and rounded, matching the team's hand-drawn sketches. Put these tokens in `src/theme/` and use nothing hard-coded in screens.

| Token       | Value                  | Use                                          |
| ----------- | ---------------------- | -------------------------------------------- |
| background  | #FFF5F8                | Screen background                            |
| surface     | #FFFFFF                | Cards, tab bar, inputs                       |
| primary     | #C2255C                | Main buttons, selected ward, rank badges 1–3 |
| primaryText | #B0174F                | Pink text and icons on white                 |
| primaryDeep | #8A0F3C                | Text on pink-tint chips                      |
| primaryTint | #FDE2EA                | Selected tab pill, rank badges 4+            |
| chipTint    | #FFF0F4                | V/C and collision chips, warnings            |
| border      | #F3B6CA                | Input and chip outlines                      |
| divider     | #F6E1E8                | Row separators                               |
| ink         | #2A1A21                | Main text; dark cards (chatbot, credits)     |
| muted       | #5E4853                | Secondary text (passes 4.5:1 on white)       |
| blue        | #2F5FB3 / tint #E8EFFB | "Combined" tags, map segments (#3B5BA9)      |

In dark mode, swap background to ink and keep text contrast at 4.5:1 or more. The app-color setting (Pink, Blue #2F5FB3, Green #2E7D4F, Plum #6B3FA0) replaces `primary` only. Colorblind mode switches map and chart colors to blue/orange, never red/green alone.

**Type.** Headings: Fredoka 600 (screen title 30, card title 19–20). Body: Inter 400/500/600 (body 15, secondary 13, labels 11–12).

**Shape and spacing.** Cards have a 22 px radius and 16–18 px padding; buttons and inputs are pill-shaped (height 44–52). Spacing runs on a 4 px grid with 18 px between cards and 20 px screen side padding. Every touch target is at least 44 × 44.

**Shared components**

- `TabBar`: 84 px tall, white, 5 items with a stroke icon + label. The active item gets a 56 × 30 primaryTint pill.
- `WardPicker`: 8 equal square buttons labeled 1–8. Selected = primary fill, white text.
- `SegmentRow`: rank badge (38 px, 12 px radius), segment name, "From → To", value on the right; tap to expand details.
- `StatTile`: big Fredoka number + small muted label, on a background-colored tile.
- `Logo`: an original winged-car mark in a rounded square (see canvas).
- Icons: one stroke icon set (e.g. lucide-react-native) at 2 px stroke; no emoji.

## 6. Screens

There are six screens, all built to the canvas. Every tab screen scrolls above the fixed tab bar. Any value the pipeline has not computed shows as —.

### Welcome (first launch only)

- Logo (96 px), "Welcome to Norman Flow", and one line: "See which Norman road segments rank highest for traffic load and collisions, ward by ward."
- A "How to use the app" video card with a play button. It opens the walkthrough video full screen.
- Three numbered steps: pick a ward; tap a segment for details; upload new counts to re-run.
- "Start the tour" (primary button) runs a coach-mark tour over Home. "Skip for now" asks "Are you sure?", then goes to Home.
- Save `hasSeenWelcome`. The ? button on Home and "Replay tutorial" in Menu reopen this screen.

### Home

1. Header: logo + "Norman Flow", ? button on the right.
2. Title "Which roads need attention?" with the subline about the 8 wards.
3. Search field "Find a street, segment or ward". Typing jumps to Search with the query.
4. "Choose a ward": WardPicker. The choice is shared with Rankings.
5. "Top priorities · Ward N": the top 3 of the combined list, each showing V/C rank, collision rank and score. Below them: "Score = V/C rank + collision rank. Only segments with both traffic counts and collisions are ranked." and a button "See all Ward N rankings" that opens Ranks.
6. Map preview card: a small static map of wards + segments, with a legend and "Open map →" to Search.
7. "Data in this analysis": four StatTiles (segments, wards, traffic counts and years, collisions and year range), all counted from the loaded data. Show "Last updated \<date>" and an "Add new data & re-rank" button (section 7).
8. Dark "Ask me about the data" card with two suggested questions that open Chatbot with that question asked.

### Search (map)

- Full-screen map of Norman: ward polygons in light fills, segments as blue lines, and the selected segment in primary with a white outline.
- Top: search field (street name or ward) + filter button. Active filters show as chips: ward, lane count, has collisions, has traffic count.
- Map type switch: Map / Satellite / Heat. Heat colors segments by V/C or by collision count, with a legend.
- Right side buttons: Layers, Reset map, zoom in/out.
- Tapping a segment opens a bottom sheet with:
  - road name, "Segment i of n · Ward N" and a "See its rank" button
  - three tiles: V/C ratio, max traffic count, collisions
  - segment length, total street length, lanes + direction, wards touched (majority marked), start and end lat/long
  - a warning chip when lane coverage is under 100%: "Lane count only mapped for X% of this segment — check the aerial view."
- The Layers sheet ("Files on this map") has a drop/upload zone for CSV, XLSX or KML and a checkbox per loaded file to show or hide it.

### Rankings

- Title "Final Rankings" with an Export button that downloads the current ward's list, or all wards, as .xlsx.
- WardPicker, then a 3-way switch: Combined / V/C ratio / Collisions.
- Search within the list, and Sort: Final rank, V/C ratio, Collisions, Traffic volume, Lanes, A–Z.
- A line "Ward N · \<list> rank" with "\<count> segments ranked".
- SegmentRows. Badges for ranks 1–3 are solid primary; the rest are tint. The right side shows the score, V/C or crashes depending on the list. Tapping a row expands it: V/C rank + ratio, collision rank + count, highest count + year, LOS E capacity + lanes, start and end points, length, and "Show on map".
- Show 20 rows at first, then "Show more segments".

### Chatbot

- Header with the bot icon, "Chatbot" and "Answers come from the files in this analysis".
- FAQ chips: How is V/C calculated? / How do I add a file? / Which file types work? / Why 1-mile segments? Tapping one posts it as a user message and adds the answer.
- Chat bubbles: bot on the left in white, user on the right in primary. An answer can attach a source file card (e.g. the ACOG PDF) with a download link.
- Text input + send button above the tab bar.
- **Answers must work offline and come only from the app's own content**: a local FAQ file plus live lookups on Results ("What's #1 in Ward 3?", "How many collisions on W Robinson St segment 2?"). Use simple keyword and intent matching. If no answer is found, say so and suggest the FAQ. Do not call an outside AI service unless the team decides to (section 8).

### Menu

- **Files**: every loaded file with a type badge (KMZ, XLSX, SHP, PDF), name and one-line summary (e.g. "333 segments · 8 ward boundaries"). Each file can be replaced or removed.
- **Resources**: ACOG network capacities (opens the PDF), City of Norman interactive map, City Council ward map. The two City maps open normanok.gov in the browser.
- **Settings**: Dark mode and Colorblind-friendly colors switches, App color swatches, Reset map, Replay tutorial. Advanced (collapsed): match distance in meters, column mapping, lane overrides.
- **Credits**: "Built by \[team names\] for the MIS Data Analytics Case Competition" and a thank-you to the City of Norman and \[professor\].

## 7. Data updates, export and Excel compatibility

The competition scores how easily City staff can rerun the analysis, so updating data must take a few taps and no cleanup.

**"Add new data & re-rank" flow**

1. Pick one or more files (.xlsx, .csv, .kml, .kmz).
2. Detect the kind of each file from its headers or KML folders: traffic counts, collisions, segments/wards, or capacity.
3. Map columns with `columnAliases.json`. Only if a required field is missing, show the column picker and save the choice.
4. Preview what changed (e.g. "+100 traffic counts (FY27), +2,300 collisions") and ask the user to confirm.
5. Run the pipeline, save Results with a timestamp, and update "Last updated". Keep the previous run so the user can compare or undo.
6. Show the diagnostics: counts matched/unmatched, collisions matched/unmatched, segments needing a lane check. Each opens a list.

New traffic years add to the old ones; they do not replace them. The highest-volume rule then picks across all years. A new collisions file replaces or adds to the old one by AccidentNumber, so nothing is double-counted.

**Excel export (expo-sharing)**

- One workbook. It has one sheet per ward with the combined, V/C and collision lists side by side, plus three more sheets:
  - `All segments`: every field from `SegmentResult`
  - `Unmatched`: collisions and counts that did not match, with the reason
  - `Run info`: date, input file names and settings used (match distance, capacity table)
- Column headers in plain English. Freeze the header row.
- This lets staff check every rank in Excel and keep using their existing macro workflows.

## 8. Build order, checklist and open questions

Build the analysis first and the screens second. A pretty app with wrong rankings fails the brief.

**Build order**

1. Scaffold the Expo Router project, theme tokens, fonts and the tab bar with five empty screens.
2. Parsers for KMZ, traffic workbooks and collisions, with column aliases. Unit-test them on the bundled files.
3. The pipeline (section 4) with its tests passing.
4. Rankings screen wired to real Results.
5. Home, then Search (map + bottom sheet + layers).
6. Import / re-rank flow and Excel export.
7. Chatbot (offline FAQ + Results lookups), Menu, Welcome and tour.
8. Dark mode, colorblind mode, app color, accessibility pass.

**Acceptance checklist**

- [ ] Fresh install loads the bundled data and shows 8 ward lists with no manual steps
- [ ] 333 segments and 8 wards load from Road_Segments.kmz
- [ ] A segment on a ward boundary appears in both wards' lists
- [ ] Each segment uses its highest traffic count across all years
- [ ] Every combined score = V/C rank + collision rank, and only segments with both are in the combined list
- [ ] Collisions on segments without traffic counts are excluded and listed under Unmatched
- [ ] A "From" collision is placed on StreetName at the given distance and direction
- [ ] Renaming or reordering a column in an input file still works (via aliases or the picker)
- [ ] Adding a new year of counts updates the rankings and "Last updated"
- [ ] Excel export opens in Excel with one sheet per ward plus All segments, Unmatched and Run info
- [ ] Every screen matches the canvas, works at 390 px wide, and has 44 px touch targets and 4.5:1 text contrast
- [ ] No hard-coded results anywhere in the UI

**Open questions for the team** (the agent should use the default shown until answered)

- [ ] Combined list order: the brief says "rank from high to low". Default: lowest score first, since a low score means a high rank on both lists.
- [ ] Unknown divider on a 4- or 6-lane road. Default: undivided capacity (lower capacity, so higher V/C), with the segment flagged.
- [ ] "At" collisions sit between two roads' segments. Default: assign them to StreetName.
- [ ] Should collisions be counted raw or per mile? Default: raw count, as the brief says.
- [x] Should the chatbot use an online AI model? Decided (update 2, Nov 17 2026): yes, Google Gemini through the team's proxy, labeled Beta, with the offline rule-based answers as fallback.
- [ ] Ship as a phone app, a web app (Expo web) or both for City staff? Default: both, from one codebase.

## 9. Implemented application behavior (November 14, 2026)

The user explicitly deferred all source datasets, the PDF and walkthrough video while they are being prepared. Ship truthful empty states for this phase. Do not seed the screenshots' 333 / 500 / 23,595 values or invent segment rankings. The supplied six PNGs are the visual reference. The original acceptance checklist above remains a release checklist, not a statement that real-data acceptance has passed.

### Routes and interaction contract

All routes are under `src/app/`, not a second root `app/` folder. Non-route code must stay outside that directory.

| Route | Behavior implemented |
| --- | --- |
| `/welcome` | First-launch modal, winged-car SVG logo, three introduction steps, Start the tour and a confirmed Skip action. Welcome-seen state persists. Replay from Home or Menu. The video button explains that the asset is forthcoming. |
| `/` | Home shows the shared ward picker, top three computed combined rows, map preview, actual dataset totals and import / diagnostics actions. Search forwards the query to Search. Suggested questions open Chatbot. The three-step coach-mark tour scrolls to and highlights ward selection, ranking details and data updates. |
| `/search` | Search road names or `Ward N`; filter by selected ward, 4+ lanes, traffic or collisions. Select a map line or result-list button to view segment geometry, metrics and lane coverage. Layers controls file visibility without modifying analysis inputs. Reset clears selection, query, filters and zoom. Native uses react-native-maps; web draws imported geometries with SVG. Native Satellite uses the map provider; web explicitly explains that imagery is mobile-only. Heat offers V/C (<1 / ≥1) and collisions (0 / 1+) with a legend. |
| `/ranks` | Shared ward selection, Combined/V/C/Collisions, road search, six sorts, expandable segment rows, 20-row pagination, Show on map, current-ward or all-ward Excel export. Rank badges come from computed results. Empty states explain missing data. |
| `/chat` | Local FAQ and keyword matching only. Supports capacity, import formats, segment lengths, ranking rules, top combined segment by ward, and collisions by road plus segment number. Unknown questions get an explicit fallback. Source card identifies the capacity table and clearly states the PDF is pending. No external AI or data upload. |
| `/menu` | Actual loaded files, replace/import and confirmed removal, resource links, local capacity table, dark mode, colorblind map palette, four accent colors, map reset and replay tutorial. Advanced exposes match distance, custom aliases, verified lane overrides, and editable LOS E capacities. Save reruns analysis. Undo restores the previous files, settings and results. Credits remain generic until names arrive. |
| `/import` | Select one or more raw files, detect content, resolve missing columns, preview before/after totals, then explicitly Confirm & re-rank. Parsing errors retain the current run. Missing geometry does not prevent saving other input kinds; their unmatched records are visible. |
| `/diagnostics` | Matched/unmatched totals, record-level unmatched reasons and source names, lane-check list, paginated review. Complete unmatched records are included in export. |

### Analysis and data contracts

- `src/analysis/` is pure TypeScript. `runPipeline(inputs, settings?, runAt?)` is deterministic; its default timestamp is empty, and the UI provides the run timestamp. Ward-specific rank fields live on each ward's result rows, not a shared segment object, because the same segment can have different ranks in different wards.
- KMZ parsing extracts KML with JSZip and parses XML with xmldom. Description `<br>` fields and KML Data fields are supported. Segment IDs require `ROAD | i of n`. Folder 02 ranks; folder 03 is map-only. Unknown wards are not guessed. Base-file Wards touched is retained; a separately sourced ward layer, or missing ward metadata, triggers geometric assignment.
- Workbook parsing prefers Raw_FY sheets to Traffic_Combined. Base_Data and recognized collision sheets are detected independently. Directional `vpd` values are summed without adding speed/date numbers. Headers are matched case- and punctuation-insensitively against `src/config/columnAliases.json` plus saved overrides.
- All original sheet rows are retained in the dataset file. Collision-related tables are indexed by case ID and attached without deleting unknown fields. `vsCODES` is preserved as a raw sheet. The City still needs to validate its final workbook schema and code meanings.
- Native app bundles cannot rewrite source JSON. User column choices are a persistent runtime overlay on `columnAliases.json`. Promote reviewed aliases back into that file in a later code change if they should become defaults for everyone.
- New traffic source files append; reimporting an existing filename replaces that source. Collision IDs merge across sources; original raw sheets remain retained. New geometry layers replace previous layers of the same kind. Removal reruns and is undoable.
- Capacity comes from `src/config/capacity.json`, optionally overridden in Advanced. Unknown 4-/6-lane division uses undivided with a flag. Unmapped lane coverage stays flagged even when lanes are overridden, so the underlying source limitation is visible.
- Collision placement uses StreetName, geometric reference intersections first and GPS fallback second. From offsets follow connected same-road polylines in the requested initial compass direction, crossing segment endpoints within 10 m. Multiple distinct intersections without a disambiguating GPS location are quarantined. Missing geometry, invalid direction, unmapped offsets, no traffic, and map-only roads have explicit unmatched reasons. Branching roads and final City inputs require real-data review before competition use.
- V/C is rounded to two decimals before ranking. Rank ties use competition ranks. Combined requires V/C and at least one matched collision; lowest score first, then higher V/C, then stable segment ID. Equal combined scores retain the same rank while V/C determines display order.
- Persistence uses SQLite key-value storage on native and IndexedDB on web, avoiding localStorage's small quota for collision workbooks. Data remains on the device/browser profile. Keep one previous run. Browser clearing and uninstalling remove local data; Excel export is a portable results copy.
- `src/services/export.ts` creates eight ward sheets (or the requested ward), with the three lists side by side, plus All segments, Unmatched, and Run info. XML worksheet panes are frozen because SheetJS CE does not expose a reliable writer API for this. Native uses a cache file and expo-sharing; web downloads a Blob. XLSX export does not preserve or embed macros.
- Theme tokens and fonts live in `src/theme/`. Use Fredoka 600 and Inter 400/500/600, pink tint surfaces, rounded cards and the five fixed tab items. Web content is centered and capped at 480 px; phone layouts use the available width. Never use screenshots as static app screens.

### Verification and remaining release work

Run `npm test`, `npx tsc --noEmit`, and `npx expo lint`. `npx expo export --platform all` checks JS bundles, not native signing or device behavior. The untouched `example/` starter archive is excluded from typecheck/lint; it is not app code.

Tests use explicitly synthetic records and cover: eight ward containers, boundary membership, highest-volume selection, 48th Ave NE northbound offset, reversed and multi-segment geometry, collision deduplication, no-traffic exclusion, shared ties, ward-independent ranks, lane overrides, short-road exclusion, raw-sheet preference, renamed headers, KMZ metadata, and Excel sheets/freeze panes.

Pending release inputs and checks:

- Final approved raw files and real-data validation (333 segments / 8 ward polygons). Automatic base-data loading is implemented; put approved files in `assets/data/base/` following its README. The folder remains empty until supplied.
- Walkthrough video playback and downloadable ACOG PDF, when assets are supplied. Current controls explicitly show their pending status.
- Optional ODOT shapefile reprojection/import; not part of the active import formats.
- Final team/professor credits and specific City resource URLs. Current City resource actions open normanok.gov as permitted in the brief.
- Native device verification, Android map-provider credentials if needed, EAS project/signing and distribution. Existing `ios/` was already present; this implementation does not modify generated native code.
- Validate full-volume import performance and persistence with the real workbooks; synthetic unit tests are not evidence of real-data correctness.
- The coach-mark tour measures Home targets and scrolls to each highlight; verify safe-area placement on the final native devices.

Dependency maintenance: SheetJS is installed from the official `cdn.sheetjs.com` 0.20.3 tarball, following its installation documentation, because the npm `xlsx` 0.18.5 release has known parsing vulnerabilities. Do not replace it with the stale registry version. Font imports point at individual weight subpaths so unused font families/weights are not bundled.

### Base-data startup (November 15, 2026)

- Approved raw files belong directly in `assets/data/base/`; see its README for preferred filenames. Metro automatically generates static asset references and content hashes via `scripts/prepare-base-data.cjs` on start/export/build. Restart Metro after changing files. Do not seed test fixtures into base data.
- Startup explicitly restores persisted uploads, loads/caches base files through the existing parser, then prepares rankings before showing routes. A themed progress screen reports these stages. File errors are visible and allow continuing with available data.
- `DatasetFile.source` distinguishes `base` and `uploaded`; legacy files without a marker are uploads. Uploaded segment/ward layers override base geometry, traffic accumulates and collision IDs merge with upload precedence. Base files remain listed separately and are maintained in the build. Removing uploaded geometry falls back to base geometry. With no base data or uploads, use truthful empty states.
- Base content hashes invalidate parsed caches. Removed bundled files leave the next analysis; changed base inputs rerun the pipeline and clear the obsolete undo snapshot. Unchanged saved analysis is reused.

### Appearance update (November 15, 2026)

The Menu sections sit flush with the page background, with no enclosing cards.
Colorblind-friendly mode has been removed from settings, persistence and map behavior.
The current swatches live in `src/theme/palette.ts`; light pink (`#f6b0e8`) is the
default primary. Existing installs using the former default migrate to light pink;
other saved accent choices remain. Use `onPrimary` for text/icons on accent fills
and `primaryText` for readable accent text on the page background.


### Current bundled analysis (November 16, 2026)

The prepared City export supersedes the earlier empty-base and 333-segment release notes. It includes 375 segment lines, 8 ward boundaries and 119 verified summary rows. The earlier KMZ fixture and raw-file pipeline remain supported. Keep the newer Home/Menu design, navigation and palette. The app joins the prepared files by the exact padded `key`, retains the published touched wards, computes ward V/C ranks using full precision (two decimals in the interface), and recomputes collision and combined ranks. Tests compare every published ward rank. Collector roads stay excluded; roads without usable counts stay on the map. Unknown collision totals and lane coverage remain missing. See `assets/data/base/README.md` for upload precedence and how to refresh the snapshot. Raw matching diagnostics exclude the summary CSV.

### Ranking and filter update (November 16, 2026) — superseded

Superseded on November 17, 2026 by "Official results" below: the official `ward_ranks` use shared ties, and unique sequential ranks disagreed with 41 of the 161 official ward ranks. The ranking type selector still uses a sheet dropdown alongside Sort.

### Map behavior update (November 16, 2026)

- Heat overlays (V/C glow, crash density, crash location markers) render only in Heat mode; switching to Map or Satellite hides them. Crash density is derived from mode + metric, not a stored flag.
- The Heat card holds V/C, Crash density and a Crash locations toggle. Files on this map lists only the upload action and source-file toggles.
- Ward fills and street lines keep their normal styling in every mode (including under crash density) unless their file is hidden. The selected road draws last with a dark casing.
- Selecting a segment from outside the map (Show on map, the road list) zooms to fit that road above the details sheet; tapping a line on the map only pans.
- Map screen layout: floating borderless controls using the `floatShadow` theme token, a labeled Map/Satellite/Heat switch, removable filter pills with a count badge on the filter button, one grouped control stack (layers, reset, zoom), and one bottom card that shows the legend or heat controls plus the selected road's summary. Sheets use `dataSurface` grouped rows, matching Home and Menu. `FileBadge` lives in `src/components/ui.tsx`.
- Menu layout: flush sections (Data, Appearance, Help, Resources) of icon-tile rows with dividers, and a small centered credits footer. The file list (base/uploaded, remove) and Advanced analysis settings (match distance, lane overrides, aliases, LOS E capacities) open in sheets instead of expanding inline.
- Rankings layout: ward pills, a Ranking type dropdown and Sort dropdown side by side (both open option sheets), a filled search field, then flush expandable `SegmentRow`s with dividers. Export is the round download button in the header.
- Chatbot layout: header with New chat, gray bot bubbles, and, before the first question, "From your data" prompts (built from the loaded results) plus FAQ questions grouped by topic. After that, unasked suggestions scroll above the input. FAQ entries in `src/config/faq.ts` come from the READMEs/AGENTS.md; order matters (first keyword match wins) and `__tests__/chat.test.ts` checks every question reaches its own answer.
- Switches use the shared `Toggle` in `src/components/ui.tsx` so the off-state track stays visible and aligned.
- Rank badges 1–3 on Rankings use the `medals` theme tokens (gold, silver, bronze) with dark ink text and a darker `medalBorders` edge; ranks 4+ use `dataSurface` with the standard `border` color.
- Home layout: header with a ? button (opens Welcome), the map preview card, Data in this analysis (dataset label, compact colored stat tiles, Add new data and Diagnostics action rows) and the dark Ask card. Home has no ward picker, top priorities, title or search field; wards are chosen on Rankings.
- Coach tour: `src/components/CoachTour.tsx` renders once in the tab layout and walks six steps across tabs (Home map, Home data, Rankings wards and controls, the first ranked row, Chatbot input, Menu data). Screens register highlight targets with `useTourTarget` (`src/components/tourTargets.ts`); targets must be direct children of their screen's scroll content so scrolling to them works.
- Welcome finishes with `router.dismissTo("/")` so replaying from Home or Menu returns to the existing Home instead of mounting a second tabs navigator (which showed two tours).

### Official results (November 17, 2026)

Team decision (from the pasted brief): the app displays the official results from the team's Excel tool / Colab notebook and doesn't recalculate them. See `assets/data/README.md`.

- Ranks use shared ties (competition ranking: 1, 1, 3) on full-precision V/C; combined = ward V/C rank + ward collision rank, lowest first, display ties by higher V/C then key. `rankingVersion` 3 invalidates saved results. Shared ties reproduce all 161 official `ward_ranks` and all four `city_*_rank` columns.
- `runPipeline` sets `Results.official` when every ranked value comes unchanged from the results file (no raw traffic or collisions, no lane/capacity overrides on ranked segments). In official mode it throws if any calculated combined ward rank differs from `ward_ranks`. V/C keeps the CSV's full precision and is rounded only for display.
- Import (`src/app/import.tsx`) detects the results CSV by its header (`key` plus `ward_ranks`/`vc`) and GeoJSON layers by content, so renamed exports work. It validates by running the pipeline before anything is saved, shows ranked counts per ward, and blocks Confirm on any error. Raw KML/KMZ and traffic/collision spreadsheets are only used under **Advanced (unofficial)**; in official mode a raw crash sheet with Lat/Lon only refreshes the hotspot layer (Norman bounding box, private-property rows dropped) and never changes counts or ranks.
- **Restore official 2026 results** (Menu, import screen) is `restoreOfficial` in the store: it drops uploads and lane/capacity overrides and reruns on the bundled files, keeping undo. The official note and dataset label come from `src/components/OfficialNote.tsx`.
- Parser mapping per the brief: `lanes` is the first integer of the lane text, `travelDirection` is `one-way`/`two-way`. Deliberate deviations: unranked segments keep collisions as missing (shown —), not 0, because the data README says blank means unknown; multi-ward segments keep no majority ward instead of claiming the first ward is the majority.
- Map views (`src/analysis/mapViews.ts`, `HeatPanel`): Heat mode offers Combined, V/C, Collisions and Hotspots. Ranked metrics have a Citywide or Ward 1–8 scope; a ward zooms to fit, fades other wards, badges its top 5 and lists them. V/C uses `vcScale` with a dark outline at V/C ≥ 1.0 ("over capacity"), Collisions uses `collisionScale`, Combined uses `combinedTiers` (top 3, 4–5, 6–10, 11+) with thicker lines for better tiers, and unranked roads are thin `unrankedRoad` gray. Hotspots keeps the crash density, adds a year filter, the "Hotspot layer: years" label, and markers on the top-10 collision segments with a list. Everything is computed from the loaded results, so imports recolor immediately. The current ward colors are kept (the brief's suggested palette was not applied).
- `__tests__/official-results.test.ts` holds the brief's acceptance tests.

### Update 2 (November 17, 2026)

From the team's "update 2" brief. Base rule: nothing here may change the official 2026 numbers.

- **Ties:** shared ranks everywhere (see "Official results"). Spot checks for Ward 1 and citywide are in `__tests__/update2.test.ts`.
- **Capacities (`src/config/capacity.json`, `src/analysis/capacity.ts`):** typed ACOG values match the bundled scanned PDF (`assets/data/base/ACOG Guidelines for Roadway Capacity vs. Number of Lanes.pdf`, opened via `src/services/bundledFiles.ts`). Added the City's "3-lane arterial (2 lanes + center turn lane)" = 18,900 with its note. `facilityKey` maps results-file facility names to table rows; one-way rows scale per lane by the official multiple.
- **Presets:** "ACOG 2025 LOS E — official" is built in and read-only (`savePreset` throws for it). Custom presets (`capacityPresets` in the store, persisted) are what-if tests: `applyPreset` reruns with `settings.capacityPreset`, so each ranked segment's capacity comes from the preset by facility and V/C and the V/C and combined ranks change; collision ranks and the results file don't. `Results.official` is then false. UI: Menu → ACOG network capacities (`CapacityPresets`), with Save (disabled for official), Save as new, a red Reset LOS E capacities (Cancel / Save first / Reset), and delete.
- **Dataset banner (`src/components/DatasetBanner.tsx`, `src/services/dataset.ts`):** on Home, Ranks and the map. "Viewing: official 2026 rankings." / "Viewing: new rankings, imported [date] from [file]" or "unofficial" with "Switch to official 2026"; a what-if line with "Back to official" when a preset is active. Exports put the dataset in the file name (`Norman-Flow-<Official-2026|Imported|Unofficial>[-WhatIf-name]-…xlsx`), as the first row of each ranking sheet, and in Run info. The optional "Compare" toggle is not built.
- **Resets:** Menu's Reset map is red and confirms first (`ResetMapButton`, `resetMap`): it deletes uploads and capacity overrides and returns to the bundled results with no undo copy. Saved presets are kept but no longer active. The map screen's round reset control stays a non-destructive view reset. Reset custom column aliases is red and confirms first (`ResetAliasesButton`). Dialog wording is in `src/config/dialogs.ts`; `ConfirmDialog` is a cross-platform modal (Alert can't show three buttons on web). On web, bottom sheets are HTML `<dialog>`s in the browser's top layer, so `ConfirmDialog` portals into the topmost open `<dialog>` (`topLayerPortal.web.ts`) instead of using `Modal`; otherwise dialogs opened from a sheet render behind it.
- **Accent buttons:** Replay tutorial is now an accent `Button` (Add or replace files already was). Green swatch darkened `#1a8f26` → `#188523` so white text passes 4.5:1; saved installs migrate. Red `danger` buttons use `#C62828` with white text.
- **Credits:** `src/config/credits.ts`.
- **Data pages:** Home's "Data in this analysis" has six tappable tiles opening `src/app/data/[topic].tsx`. Wording is in `src/config/dataPages.ts`; key numbers are computed live by `src/analysis/dataStats.ts` and tested against the bundled data. `Final_Segments.kmz` isn't bundled, so its page shows it as not included.
- **AI chatbot (Beta):** `src/services/aiChat.ts` posts the question, recent history and a data context (`src/analysis/chatContext.ts`: ranked segments, ward rankings, capacities, data pages) to `EXPO_PUBLIC_CHAT_PROXY_URL`. The Cloudflare Worker in `proxy/` holds `GEMINI_API_KEY`, fixes the grounding rules, rate-limits and calls Gemini. With no URL, a network error, a timeout or a 429, it falls back to the rule-based answers and shows "AI unavailable, showing basic answers." Tests check that no API key or Gemini endpoint appears in `src/` or `app.json` and that device requests carry no key.
- **Tests:** component tests (`*.test.tsx`) use `@testing-library/react-native` v14, where `render` and `fireEvent` are async. Stub `lucide-react-native` (ESM-only) and `src/services/bundledFiles` (binary assets) in those tests.

### Map links and tool videos (November 17, 2026)

- **See its rank:** the map's segment sheet sets `rankFocus` in the store (segment, ward, changing `key`) and goes to Rankings. Rankings handles each `key` once: it shows that ward (the ward already selected if the segment is in it), clears search and sort, picks a list containing the segment, loads enough rows, scrolls to the row and shows it outlined and expanded (`SegmentRow` `highlighted`). Unranked segments get a note saying why. Changing ward or ranking type clears the highlight.
- **Ward taps:** tapping inside a ward on the map (not on a road) outlines it and shows a floating Ward card (segment and ranked counts, a Rankings shortcut, close). `RoadMap` takes `onSelectWard`/`selectedWard` on web (SVG polygon click) and native (`Polygon` `tappable`). Tapping a road or resetting the map clears it.
- **Credits:** Mariazucena Gonzalez (formerly listed as Susi).
- **Reusable tools videos (`/videos`):** opened from Menu → Help and the import screen. The list lives in `src/config/toolVideos.ts` (tools: Excel tool, Colab notebook, Power BI and Google Sheets, the last two tagged in development). Add a video by pasting its share link into `url`; videos without one show "Video coming soon". Links open in the in-app browser (`expo-web-browser`), so YouTube or Drive links need no new native module. The Welcome walkthrough video is still separate and pending.
