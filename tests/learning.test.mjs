import test from "node:test";
import assert from "node:assert/strict";
import {
  extractStudyMaterial,
  extractDistributedTopics,
  MAX_MATERIAL_BYTES,
  MAX_PDF_PAGES,
  scoreReadiness,
  nextReview,
  SAMPLE,
} from "../src/learning.js";
const topics = extractStudyMaterial([{ page: 1, text: SAMPLE }], "sample");
test("sample yields four topics and twenty source-grounded practice cards", () => {
  assert.equal(topics.length, 4);
  assert.equal(topics.flatMap((t) => t.cards).length, 20);
  assert.equal(topics[0].title, "Stakeholders and user research");
});
test("every quiz answer appears in its own source and the prompt removes it", () => {
  for (const t of topics)
    for (const c of t.cards) {
      assert.ok(c.source.includes(c.answer));
      assert.ok(c.question.includes("_____"));
      assert.equal(c.page, 1);
      assert.equal(c.documentId, "sample");
    }
});
test("no fabricated content on empty extraction", () => {
  assert.deepEqual(extractStudyMaterial([{ page: 1, text: "" }], "blank"), []);
});
test("page attribution survives multi-page extraction", () => {
  const x = extractStudyMaterial(
    [
      { page: 4, text: SAMPLE },
      { page: 7, text: SAMPLE },
    ],
    "pdf",
  );
  assert.equal(x[0].page, 4);
  assert.equal(x[4].page, 7);
  assert.equal(new Set(x.map((t) => t.id)).size, x.length);
});
test("large PDFs sample practice topics across the document", () => {
  const pages = Array.from({ length: 500 }, (_, index) => ({
    page: index + 1,
    text: SAMPLE,
  }));
  const sampled = extractDistributedTopics(pages, "large-pdf");
  assert.equal(MAX_PDF_PAGES >= 500, true);
  assert.equal(MAX_MATERIAL_BYTES, 100 * 1024 * 1024);
  assert.equal(sampled.length, 60);
  assert.equal(sampled[0].page, 1);
  assert.equal(sampled.at(-1).page, 500);
  assert.equal(new Set(sampled.map((topic) => topic.id)).size, 60);
  assert.ok(sampled.every((topic) => topic.documentId === "large-pdf"));
});
test("readiness starts at zero with no invented evidence", () => {
  const s = scoreReadiness(topics, []);
  assert.equal(s.confidence, 0);
  assert.equal(s.accuracy, null);
  assert.equal(s.attempted, 0);
});
test("repeating one card does not inflate coverage", () => {
  const cardId = topics[0].cards[0].id;
  const s = scoreReadiness(
    topics,
    Array.from({ length: 10 }, () => ({ cardId, mode: "quiz", correct: true })),
  );
  assert.equal(s.correct, 1);
  assert.equal(s.coverage, 5);
  assert.equal(s.confidence, 5);
});
test("latest wrong attempt removes previous correct evidence", () => {
  const cardId = topics[0].cards[0].id,
    s = scoreReadiness(topics, [
      { cardId, mode: "quiz", correct: true },
      { cardId, mode: "quiz", correct: false },
    ]);
  assert.equal(s.correct, 0);
  assert.equal(s.attempted, 1);
});
test("self-rated flashcards do not inflate quiz evidence", () => {
  assert.equal(
    scoreReadiness(topics, [
      { cardId: topics[0].cards[0].id, mode: "flash", correct: true },
    ]).correct,
    0,
  );
});
test("attempts from a different course are excluded", () => {
  assert.equal(
    scoreReadiness(topics, [{ cardId: "other", mode: "quiz", correct: true }])
      .attempts,
    0,
  );
});
test("simple review intervals are bounded and failed recall returns next day", () => {
  assert.equal(nextReview([], "a", true, "2026-10-03"), "2026-10-04");
  assert.equal(
    nextReview([{ cardId: "a", correct: true }], "a", true, "2026-10-03"),
    "2026-10-06",
  );
  assert.equal(
    nextReview([{ cardId: "a", correct: true }], "a", false, "2026-10-03"),
    "2026-10-04",
  );
});
