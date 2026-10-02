import { iso, addDays } from "./planner.js";
const STOP = new Set(
  "about after again also among because before being between could during every first from have into more most other over should some than that their them there these they this those through under using very what when where which while with would your".split(
    " ",
  ),
);
export function extractStudyMaterial(pages, documentId) {
  const topics = [];
  let counter = 0;
  for (const page of pages) {
    const blocks = page.text
      .replace(/\r/g, "")
      .split(/\n\s*\n|(?=^#{1,3}\s)/m)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      let heading = "";
      if (lines[0]?.length < 90 && (lines.length > 1 || /^#/.test(lines[0]))) {
        heading = lines.shift().replace(/^#+\s*/, "");
      }
      const body = lines.join(" ").replace(/\s+/g, " ").trim();
      if (body.length < 40) continue;
      const sentences = (
        body.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [body]
      )
        .map((s) => s.trim())
        .filter((s) => s.length >= 35 && s.length <= 700);
      for (let offset = 0; offset < sentences.length; offset += 5) {
        const chunk = sentences.slice(offset, offset + 5);
        if (!chunk.length) continue;
        const id = `${documentId}-t${counter++}`;
        const cards = [];
        chunk.forEach((sentence, i) => {
          let answer, question;
          const def = sentence.match(
            /^(.{3,65}?)\s+(?:is|are|refers to|means|describes)\s+(.{15,})[.!?]?$/i,
          );
          if (
            def &&
            !/^(it|this|there|they|these|that|we|you)\b/i.test(def[1]) &&
            def[1].split(" ").length <= 8
          ) {
            answer = def[1].trim();
            question = sentence.replace(answer, "_____");
          } else {
            const words = sentence.match(/[A-Za-z][A-Za-z-]{5,}/g) || [];
            answer = words
              .filter((w) => !STOP.has(w.toLowerCase()))
              .sort((a, b) => b.length - a.length)[0];
            if (!answer) return;
            question = sentence.replace(
              new RegExp(
                `\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                "g",
              ),
              "_____",
            );
          }
          cards.push({
            id: `${id}-c${i}`,
            topicId: id,
            question,
            answer,
            source: sentence,
            page: page.page,
            documentId,
          });
        });
        const keywords = (
          chunk.join(" ").match(/[A-Za-z][A-Za-z-]{5,}/g) || []
        ).filter((w) => !STOP.has(w.toLowerCase()));
        topics.push({
          id,
          title:
            (heading ||
              keywords.slice(0, 3).join(" · ") ||
              `Topic ${counter}`) + (offset ? " · continued" : ""),
          notes: chunk,
          cards,
          page: page.page,
          documentId,
        });
        if (topics.length >= 60) return topics;
      }
    }
  }
  return topics;
}
export function scoreReadiness(topics, attempts) {
  const cards = topics.flatMap((t) => t.cards),
    ids = new Set(cards.map((c) => c.id));
  const relevant = attempts.filter(
    (a) => ids.has(a.cardId) && a.mode === "quiz",
  );
  const latest = new Map();
  for (const a of relevant) latest.set(a.cardId, a);
  const correct = [...latest.values()].filter((a) => a.correct).length;
  return {
    total: cards.length,
    attempted: latest.size,
    correct,
    coverage: cards.length ? Math.round((latest.size / cards.length) * 100) : 0,
    confidence: cards.length ? Math.round((correct / cards.length) * 100) : 0,
    accuracy: relevant.length
      ? Math.round(
          (relevant.filter((a) => a.correct).length / relevant.length) * 100,
        )
      : null,
    attempts: relevant.length,
  };
}
export function nextReview(attempts, cardId, correct, day = iso()) {
  const successes = attempts.filter(
    (a) => a.cardId === cardId && a.correct,
  ).length;
  return addDays(
    day,
    correct ? Math.min(14, [1, 3, 7, 14][Math.min(successes, 3)]) : 1,
  );
}
export const SAMPLE = `# Stakeholders and user research
Stakeholders are people or groups affected by a project or able to influence its outcome. Stakeholder mapping is a method for identifying people involved in a project and comparing their influence and interest. User research is the systematic study of people's needs, behaviours and contexts. Interviews gather detailed accounts of experiences through open questions. Observations record what people do in a real setting rather than relying only on what they report.

# Framing the problem
A problem statement is a concise description of a user, their unmet need and the context in which it occurs. Assumptions are beliefs accepted without sufficient supporting evidence. A hypothesis is a testable prediction about an intervention or explanation. Constraints are limits on the resources, time or scope available for a project. Success criteria define the evidence needed to judge whether a solution has achieved its purpose.

# Prototyping and evaluation
A prototype is an early representation of a solution used to explore and test ideas. Formative evaluation is testing during development to identify improvements. Usability is the extent to which people can achieve their goals effectively and efficiently in a particular context. Accessibility is the design of products so that people with varied abilities can use them. Iteration is the repeated process of making a change, testing it and learning from the result.

# Comparing alternatives
A trade-off is a choice that improves one outcome while reducing another. Feasibility is the ability to deliver a proposed solution with available resources and constraints. Desirability is how well a solution meets the needs and preferences of intended users. Evidence is information used to support or challenge a claim. A limitation is a boundary on what can be concluded from a method, sample or result.`;
export async function readDocument(file, onProgress = () => {}) {
  if (file.size > 15 * 1024 * 1024)
    throw Error("Choose a file smaller than 15 MB.");
  const ext = file.name.split(".").pop().toLowerCase();
  if (["txt", "md"].includes(ext)) {
    const text = await file.text();
    if (text.length > 250000)
      throw Error("Use a document under 250,000 characters.");
    return [{ page: 1, text }];
  }
  if (ext !== "pdf")
    throw Error(
      "Use a text-based PDF, TXT or Markdown file. Export Word and slides to PDF first.",
    );
  const pdfjs = await import("../vendor/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../vendor/pdf.worker.mjs",
    import.meta.url,
  ).href;
  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  try {
    if (doc.numPages > 80) throw Error("Use a PDF with 80 pages or fewer.");
    const pages = [];
    let size = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(`Reading page ${n} of ${doc.numPages}…`);
      const page = await doc.getPage(n),
        content = await page.getTextContent();
      let text = "";
      for (const item of content.items)
        text += item.str + (item.hasEOL ? "\n" : " ");
      size += text.length;
      if (size > 250000)
        throw Error(
          "Use a shorter document, under 250,000 extracted characters.",
        );
      pages.push({ page: n, text });
    }
    if (pages.reduce((n, p) => n + p.text.trim().length, 0) < 60)
      throw Error(
        "This PDF has no usable text layer. Upload a text-based PDF or paste the text; scanned pages need OCR first.",
      );
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}
