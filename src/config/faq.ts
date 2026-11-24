// Offline answers for the Chatbot. Content comes from the project READMEs and
// AGENTS.md. Order matters: the first matching entry answers, so specific
// questions sit above broad ones (e.g. "V/C of 1.0" before "How is V/C calculated?").
export type FaqTopic = "Rankings" | "Data" | "Map" | "Using the app";
export type Faq = {
  question: string;
  topic: FaqTopic;
  keywords: RegExp;
  answer: string;
  source?: string;
};
export const faqTopics: FaqTopic[] = [
  "Rankings",
  "Data",
  "Map",
  "Using the app",
];
export const faqs: Faq[] = [
  {
    question: "What does a V/C of 1.0 mean?",
    topic: "Rankings",
    keywords: /(v\/?c|ratio).*(1(\.0)?|one|over|above|mean)|over capacity/i,
    answer:
      "V/C compares traffic with what the road is designed to carry. 1.0 means the highest recorded daily volume equals the road’s LOS E capacity; anything at or above 1.0 is over capacity. Lower values mean more spare capacity.",
  },
  {
    question: "How is the combined score calculated?",
    topic: "Rankings",
    keywords: /combined|score/i,
    answer:
      "Combined score = V/C rank + collision rank, both within the same ward. For example, 2nd in collisions and 4th in V/C gives a score of 6. The lowest score ranks first. Only segments with both a V/C and at least one collision are in the combined list.",
  },
  {
    question: "How are ties ranked?",
    topic: "Rankings",
    keywords: /\btie|tied|same rank|equal/i,
    answer:
      "Ties share the best rank, like the official Excel tool: two segments tied for 1st are both #1 and the next is #3 (1, 1, 3). In the combined list, a tie is listed with the higher V/C first.",
  },
  {
    question: "Why is a road in two wards’ lists?",
    topic: "Rankings",
    keywords:
      /two wards|both wards|boundary|more than one ward|multiple wards/i,
    answer:
      "City rule: a segment that touches two wards is ranked in both. Each ward ranks its own segments, so the same road can have a different rank in each list. The All view ranks every unique segment citywide.",
  },
  {
    question: "Why are only some segments ranked?",
    topic: "Rankings",
    keywords:
      /only some|not ranked|unranked|why.*segments.*ranked|missing.*rank|left out/i,
    answer:
      "A segment needs a usable traffic count to get a V/C. Segments with no usable count, and collector roads the City asked to leave out, stay on the map but don’t enter the rankings.",
  },
  {
    question: "How is V/C calculated?",
    topic: "Rankings",
    keywords: /v\/?c|capacity|capacities|ratio|los e/i,
    answer:
      "V/C is the highest recorded two-way daily traffic volume divided by the road’s LOS E capacity. Capacity comes from the ACOG table, using the segment’s lane count (from City street data or a team aerial check) and facility type. For example, the guidelines list 17,100 vehicles per day for a 2-lane arterial and 38,000 for a 4-lane divided arterial.",
    source: "ACOG roadway capacity guidelines",
  },
  {
    question: "Which traffic count is used?",
    topic: "Data",
    keywords:
      /which (traffic )?count|highest (count|volume)|traffic count|volume/i,
    answer:
      "Each segment uses its highest two-way count across all years (City rule: 18,000 in 2019 and 20,000 in 2025 → 20,000). Collector-class counts are left out. Adding a new year of counts keeps the old years and picks the highest again.",
  },
  {
    question: "Which years of crashes are included?",
    topic: "Data",
    keywords:
      /which years|years? of (crash|collision)|2016|2026|how (old|recent)|date range/i,
    answer:
      "The bundled official results cover 2016 to 2026. Collision totals count crashes per segment.",
  },
  {
    question: "Where does the data come from?",
    topic: "Data",
    keywords:
      /where.*(data|come from)|source|city data|files? (are|is) (included|bundled)/i,
    answer:
      "The app ships with the official 2026 results from the team’s Excel tool, including the rankings table, road segments, City Council ward boundaries and recorded crash locations. To update them, import a new results file from Menu.",
  },
  {
    question: "Is my data sent anywhere?",
    topic: "Data",
    keywords:
      /privacy|private|sent|upload.*(server|cloud)|online|internet|offline|secure/i,
    answer:
      "Your files and results are saved only on this device or browser. When the AI chatbot (Beta) is available, your question and a summary of the loaded rankings are sent to the team’s server, which asks Google Gemini for an answer; the City data contains no personal information, and the API key never leaves that server. If the AI is unavailable, answers come from the app itself, offline. Export to Excel to keep a copy.",
  },
  {
    question: "What are the numbered map markers?",
    topic: "Map",
    keywords: /marker|numbered|pin|badge/i,
    answer:
      "In Heat mode’s Hotspots view, the numbered markers show the 10 segments with the most crashes citywide (1 = most). In a ward view, numbered badges mark that ward’s top 5 for the selected ranking.",
  },
  {
    question: "How does the crash heat map work?",
    topic: "Map",
    keywords: /heat ?map|density|hotspot|crash locations?/i,
    answer:
      "Switch the map to Heat, then pick Crash density. Each recorded crash counts equally, and nearby crashes within about 200 metres add up into hotspots shown from yellow to dark red. Turn on Crash locations to see the individual points. The heat map is for display only; it doesn’t change any collision totals or rankings.",
  },
  {
    question: "Why are some roads gray?",
    topic: "Map",
    keywords: /gr[ae]y|faded|no color|uncomputed/i,
    answer:
      "Gray roads have no computed value: either there is no usable traffic count, or it is a collector road the City left out of the rankings. They stay on the map for reference.",
  },
  {
    question: "How do I add a file?",
    topic: "Using the app",
    keywords: /add|upload|import|new file|replace/i,
    answer:
      "Run the Norman Flow Excel tool (or the Colab notebook) with the new data, then tap “Add new data & re-rank” in Menu and choose the norman_flow_rankings.csv it creates (plus new segment, ward or crash-point files if they changed). The app checks the file, shows a preview, and updates every screen when you confirm. You can undo the last run, or restore the official 2026 results, from Menu.",
  },
  {
    question: "How do I update the data next year?",
    topic: "Using the app",
    keywords: /update|next year|refresh|rerun|re-run|new year/i,
    answer:
      "Don’t edit the base data. Run the team’s Excel tool or Colab notebook with the new traffic and crash data, then import the norman_flow_rankings.csv it creates. Add new norman_segments.geojson and norman_wards.geojson files only if the segments or wards changed. The app checks every ward rank against the file before anything changes, and keeps the previous run so you can undo.",
  },
  {
    question: "How do I export the rankings?",
    topic: "Using the app",
    keywords: /export|excel|xlsx|download|spreadsheet/i,
    answer:
      "On Rankings, tap the download button. Export one ward, all 8 wards or the citywide list. The workbook has one sheet per ward (combined, V/C and collision lists side by side) plus All segments, Unmatched and Run info sheets. Macros are not included.",
  },
  {
    question: "Which file types work?",
    topic: "Using the app",
    keywords: /file type|format|csv|kmz|kml|geojson/i,
    answer:
      "The official update is the results CSV from the Norman Flow Excel tool, optionally with the segments, wards and crash-points GeoJSON files. A crash spreadsheet with Lat/Lon columns can refresh the hotspot map only. Raw traffic and collision spreadsheets and KML/KMZ road files work only under Advanced (unofficial), and those results won’t match the official tool. Rankings export to XLSX.",
  },
  {
    question: "Why 1-mile segments?",
    topic: "Using the app",
    keywords: /mile|segment length|short/i,
    answer:
      "The City asked for segments of about one mile so each one has its own traffic count, crash count and ward. Each road is cut only at real intersections with major roads, and where the number of lanes changes, choosing the cuts closest to one mile; most segments are 0.97–1.03 miles. Collision rankings use raw counts, not counts per mile.",
  },
  {
    question: "Where are the tool tutorial videos?",
    topic: "Using the app",
    keywords: /video|tutorial|power ?bi|google sheets|watch/i,
    answer:
      "Open Menu → Reusable tools videos (or Watch the tool tutorials on the import screen). There are videos for the Norman Flow Excel tool and the Google Colab notebook, with Power BI and Google Sheets versions in development. Videos that aren’t published yet show “Video coming soon”.",
  },
  {
    question: "Does the app recommend projects?",
    topic: "Using the app",
    keywords: /recommend|fix|cost|project|should we|budget/i,
    answer:
      "No. Norman Flow only produces ranked lists of road segments for each ward. It never recommends projects, costs or fixes; those decisions stay with City staff.",
  },
];
