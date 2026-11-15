export const faqs = [
  {
    question: "How is V/C calculated?",
    keywords: /v\/?c|capacity|capacities|ratio/i,
    answer:
      "V/C is the highest recorded daily traffic volume divided by the road’s LOS E capacity, rounded to two decimals. Capacity comes from the ACOG table and the segment’s lane count and facility type. For example, the supplied guidelines list 17,100 vehicles per day for a 2-lane arterial and 38,000 for a 4-lane divided arterial.",
    source: "ACOG roadway capacity guidelines",
  },
  {
    question: "How do I add a file?",
    keywords: /add|upload|import|new file/i,
    answer:
      "Tap “Add new data & re-rank” on Home, or open Layers on the map. Choose your files, check the detected columns and preview, then confirm. New traffic years are added; collisions are deduplicated by case number. You can undo the last run from Menu.",
  },
  {
    question: "Which file types work?",
    keywords: /file type|format|xlsx|csv|kmz|kml/i,
    answer:
      "Import traffic counts and collisions as XLSX or CSV. Import road segments and ward boundaries as KML or KMZ. Rankings export to XLSX. The optional ODOT shapefile and ACOG PDF will be connected when those assets are supplied.",
  },
  {
    question: "Why 1-mile segments?",
    keywords: /mile|segment length/i,
    answer:
      "The competition brief uses the KMZ’s folder 02 segments (at least one mile) for ranking. Shorter roads in folder 03 appear on the map only. Collision rankings use raw counts, not counts per mile.",
  },
];
