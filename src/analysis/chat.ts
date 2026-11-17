import { faqs } from "../config/faq";
import { Results } from "./types";
import { normalizeRoad } from "./roads";
export function answerQuestion(
  question: string,
  results: Results | null,
): { text: string; source?: string } {
  const ward = question.match(/ward\s*([1-8])/i);
  if (ward && /top|#?1|first|highest/i.test(question.replace(ward[0], ""))) {
    const row = results?.wards[Number(ward[1])].combined[0];
    return {
      text: row
        ? `${row.road}, segment ${row.index} of ${row.of}, is ranked #${row.combinedRank} in Ward ${ward[1]}’s combined list. Score: ${row.combinedScore} (V/C rank ${row.vcRank} + collision rank ${row.collisionRank}).`
        : `There are no computed combined rankings for Ward ${ward[1]} yet. Import the data to calculate them.`,
    };
  }
  if (/collision|crash/i.test(question) && /segment\s*\d+/i.test(question)) {
    const index = Number(question.match(/segment\s*(\d+)/i)?.[1]);
    const normalized = normalizeRoad(question);
    const s = results?.segments.find(
      (s) => s.index === index && normalized.includes(normalizeRoad(s.road)),
    );
    return {
      text:
        s?.collisions === null
          ? "The supplied data has no collision total for that segment."
          : s
            ? `${s.road}, segment ${s.index}, has ${s.collisions} matched collisions${s.maxVolume === undefined ? " and no matched traffic count; it is excluded from rankings" : ""}.`
            : "I couldn’t find that road segment in the loaded analysis. Try the full road name and segment number.",
    };
  }
  const faq = faqs.find((f) => f.keywords.test(question));
  if (faq) return { text: faq.answer, source: faq.source };
  if (/score|combined|rank/i.test(question))
    return {
      text: "Each ward is ranked separately, and every rank is a unique position (1, 2, 3, 4). The combined score adds the V/C rank and collision rank: the lowest score comes first, and higher V/C breaks a score tie. Only segments with a V/C and at least one matched collision enter the combined list.",
    };
  return {
    text: "I couldn’t find an answer in the app’s content or current analysis. Try one of the suggested questions, ask “What’s #1 in Ward 3?”, or ask for collisions on a named road segment. I can explain rankings, but cannot recommend projects, costs or fixes.",
  };
}
