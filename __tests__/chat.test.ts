import { expect, it } from "@jest/globals";
import { answerQuestion } from "../src/analysis/chat";
import { faqs } from "../src/config/faq";

it("answers every suggested question with its own FAQ entry", () => {
  for (const faq of faqs)
    expect([faq.question, answerQuestion(faq.question, null).text]).toEqual([
      faq.question,
      faq.answer,
    ]);
});

it("routes common phrasings to the intended answers", () => {
  const answer = (q: string) => answerQuestion(q, null).text;
  const find = (q: string) => faqs.find((f) => f.question === q)!.answer;
  expect(answer("How do I refresh the data next year?")).toBe(
    find("How do I update the data next year?"),
  );
  expect(answer("Is V/C over 1 bad?")).toBe(
    find("What does a V/C of 1.0 mean?"),
  );
  expect(answer("Can I download an Excel file?")).toBe(
    find("How do I export the rankings?"),
  );
});

it("keeps every suggested question unique", () => {
  expect(new Set(faqs.map((f) => f.question)).size).toBe(faqs.length);
});
