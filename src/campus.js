import { numericDate, parseNumericDate } from "./dates.js";
import { iso, addDays, dateLabel } from "./planner.js";
import {
  extractStudyMaterial,
  scoreReadiness,
  nextReview,
  readDocument,
  SAMPLE,
} from "./learning.js";
const K = "again.campus.v1",
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let persistenceFailed = false;
let db = { courses: [], attempts: [], selected: null, reminder: null },
  api,
  practice = null,
  uploading = false;
try {
  const x = JSON.parse(localStorage.getItem(K));
  if (
    x &&
    Array.isArray(x.courses) &&
    Array.isArray(x.attempts) &&
    x.courses.every(
      (c) => Array.isArray(c.topics) && Array.isArray(c.documents),
    )
  )
    db = x;
} catch {}
const course = () =>
  db.courses.find((c) => c.id === db.selected) || db.courses[0];
function persist() {
  try {
    localStorage.setItem(K, JSON.stringify(db));
    persistenceFailed = false;
    return true;
  } catch {
    persistenceFailed = true;
    api.toast(
      "Device storage is full. Export your learning data before leaving.",
    );
    return false;
  }
}
export function campusExport() {
  return db;
}
export function campusRestore(value) {
  if (
    !value ||
    !Array.isArray(value.courses) ||
    !Array.isArray(value.attempts) ||
    !value.courses.every(
      (c) =>
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        Array.isArray(c.documents) &&
        Array.isArray(c.topics) &&
        c.topics.every(
          (t) =>
            typeof t.title === "string" &&
            Array.isArray(t.notes) &&
            t.notes.every((n) => typeof n === "string") &&
            Array.isArray(t.cards) &&
            t.cards.every((k) =>
              ["id", "question", "answer", "source"].every(
                (f) => typeof k[f] === "string",
              ),
            ),
        ),
    )
  )
    throw Error("Invalid learning data in backup.");
  db = value;
  persist();
}
export function clearCampus() {
  db = { courses: [], attempts: [], selected: null, reminder: null };
  localStorage.removeItem(K);
}
function tools() {
  return `<div class="plan-toolbar"><div class="course-select"><label for="course-select">COURSE</label><select id="course-select">${db.courses.map((c) => `<option value="${esc(c.id)}" ${c.id === course()?.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div><button class="secondary" data-campus="new-course">+ New course</button><button class="secondary" data-campus="upload" ${!course() ? "disabled" : ""}>Add materials ↗</button></div></div>`;
}
function empty() {
  return `<section class="empty-state"><div class="eyebrow">A PLACE FOR WHAT YOU’RE LEARNING</div><h1 class="large-heading">From material<br>to making sense of it.</h1><p class="subtext">Bring a course, a few pages, and a little curiosity.<br>Leave with topics, source-linked notes and something to practise.</p><div class="button-row" style="justify-content:center"><button class="secondary" data-campus="sample">Explore a sample course</button><button class="primary" style="flex:0 1 220px" data-campus="new-course">Create a course <span>↗</span></button></div></section>`;
}
export function campusScreen(view) {
  const c = course();
  if (!c) return empty();
  const score = scoreReadiness(c.topics, db.attempts);
  return `${persistenceFailed ? '<div class="notice warning">Device storage is full. Recent changes are only in memory. Export a backup before closing.</div>' : ""}<div class="eyebrow">${view === "readiness" ? "YOUR LEARNING, IN VIEW" : "YOUR COURSE LIBRARY"}</div><h1 class="large-heading">${view === "readiness" ? "Know what needs another look." : esc(c.name)}</h1><p class="subtext">${view === "readiness" ? "Evidence from your practice, not a prediction of your exam grade." : esc(c.goal || "Understand it. Practise it. Make room for it.")}</p>${tools()}${view === "readiness" ? dashboard(c, score) : library(c)}`;
}
function library(c) {
  return `<div class="learning-summary"><div><b>${c.documents.length.toString().padStart(2, "0")}</b><span>materials</span></div><div><b>${c.topics.length.toString().padStart(2, "0")}</b><span>small topics</span></div><div><b>${c.topics
    .reduce((n, t) => n + t.cards.length, 0)
    .toString()
    .padStart(
      2,
      "0",
    )}</b><span>practice cards</span></div><button class="primary" data-campus="quiz">Test what you know <span>↗</span></button></div><div class="notice">Notes and questions are draft excerpts from your materials. Check the source before relying on them. Text-based PDF, TXT and Markdown stay on this device.</div>${c.documents.length ? `<div class="document-shelf">${c.documents.map((d) => `<button class="document-tile" data-source-doc="${esc(d.id)}"><span>▤</span><div><strong>${esc(d.name)}</strong><small>${d.pages.length} ${d.pages.length === 1 ? "page" : "pages"} · ${d.kind === "sample" ? "SAMPLE MATERIAL" : "ADDED BY YOU"}</small></div><span>↗</span></button>`).join("")}</div>` : `<div class="empty-state"><h2>Your next chapter starts here.</h2><button class="secondary" data-campus="upload">Add your first material ↗</button></div>`}<div class="plan-toolbar"><button class="secondary" data-campus="plan-course">Turn topics into a study plan ↗</button></div><div class="section-title"><h2>Small topics. Deeper understanding.</h2><button class="text-button" data-campus="flashcards">Practise flashcards ↗</button></div><div class="topic-grid">${c.topics
    .map((t, i) => {
      const s = scoreReadiness([t], db.attempts);
      return `<article class="topic-card"><div class="card-head"><span class="eyebrow">${String(i + 1).padStart(2, "0")} / TOPIC</span><span class="tag">${s.correct}/${s.total} checked</span></div><h2>${esc(t.title)}</h2><p>${esc(t.notes[0])}</p><div class="topic-actions"><button class="text-button" data-topic="${esc(t.id)}">Open study notes ↗</button><button class="tiny-round" data-practise-topic="${esc(t.id)}" aria-label="Practise ${esc(t.title)}">→</button></div></article>`;
    })
    .join(
      "",
    )}</div><div class="guide-banner"><div><span class="eyebrow">THINK IT THROUGH. DON’T HAND IT OVER.</span><h2>An assignment guide, not an answer machine.</h2><p class="subtext">Bring your brief. Build your own argument, one step at a time.</p></div><button class="secondary" data-campus="guide">Unpack my assignment ↗</button></div>`;
}
function dashboard(c, s) {
  const days = c.exam
    ? Math.max(
        0,
        Math.round((Date.parse(c.exam) - Date.parse(iso())) / 86400000),
      )
    : null;
  return `<div class="readiness-grid"><div class="readiness-panel"><span class="eyebrow">PRACTICE COVERAGE</span><div class="readiness-number">${s.confidence}<span>%</span></div><p>${s.correct} of ${s.total} questions answered correctly on the latest quiz attempt.</p><div class="progress-track"><i style="width:${s.confidence}%"></i></div><p class="hint">${s.attempted} distinct questions attempted. ${s.total - s.attempted} untested. Flashcard self-ratings do not count as quiz evidence.</p></div><div class="exam-panel"><span class="eyebrow">THE GOAL AHEAD</span><h2>${c.exam ? dateLabel(c.exam) : "Give your learning a date."}</h2><p class="subtext">${days !== null ? `${days} days until your target exam date.` : "Set a target exam date and learning goal."}</p><p>${esc(c.goal || "Build understanding, one topic at a time.")}</p><button class="secondary" data-campus="course-goal">Edit learning goal ↗</button><button class="text-button" data-campus="reminder">Set a study reminder</button></div></div><div class="notice ${s.attempted < 5 ? "warning" : ""}">${s.attempted < 5 ? "Not enough practice evidence yet. Try at least five different questions before interpreting this picture." : "A correct cloze answer is evidence of recall on this material, not proof of understanding the whole course. Keep using past papers and application questions."}</div><div class="section-title"><h2>Where to spend your next 20 minutes.</h2><button class="text-button" data-campus="quiz">Start a quiz ↗</button></div><div class="readiness-rows">${c.topics
    .map((t) => {
      const ts = scoreReadiness([t], db.attempts);
      return `<div class="readiness-row"><div><strong>${esc(t.title)}</strong><p>${ts.correct}/${ts.total} correct · ${ts.total - ts.attempted} untested</p></div><div class="progress-track"><i style="width:${ts.confidence}%"></i></div><button class="secondary" data-plan-topic="${esc(t.id)}">Add 20m to plan ↗</button></div>`;
    })
    .join(
      "",
    )}</div><p class="hint">Adding a review task updates your assignment workload. Recheck capacity before accepting a recovery plan.</p>`;
}
function uploadModal() {
  api.modal(
    `${api.header("Bring your course to life.")}<p class="subtext">Try the import flow with <button class="text-button" data-campus="sample-pdf">our sample PDF ↗</button>, or add your own material below.</p><form id="material-form"><label class="field">Material title<input name="title" placeholder="e.g. Week 3 lecture notes" maxlength="120"></label><label class="field">Upload PDF, TXT or Markdown<input type="file" name="file" accept=".pdf,.txt,.md"></label><p class="subtext">Or paste your notes. Use headings and blank lines to separate topics.</p><label class="field">Paste course material<textarea name="text" rows="7" maxlength="1500000" placeholder="# Topic name&#10;A concept is…"></textarea></label><p class="hint">PDFs: text layer required, up to 500 pages / 50 MB. For scanned pages, run OCR first. Pasted text takes precedence over a file.</p><p class="error" id="upload-error" role="alert"></p><p class="subtext" id="upload-status" role="status"></p><button type="submit" class="primary" id="upload-submit">Create my study material <span>↗</span></button></form>`,
  );
}
function source(docId, page = 1) {
  const c = course(),
    d = c.documents.find((d) => d.id === docId);
  if (!d) return;
  api.modal(
    `${api.header(esc(d.name))}<span class="tag">SOURCE MATERIAL · PAGE ${page}</span><div class="source-text">${esc(d.pages.find((p) => p.page === page)?.text || d.pages[0]?.text || "")}</div><p class="hint">Extracted text. Layout and diagrams may not be preserved.</p>`,
  );
}
function notes(id) {
  const c = course(),
    t = c.topics.find((t) => t.id === id);
  if (!t) return;
  api.modal(
    `${api.header(esc(t.title))}<span class="tag">SOURCE-LINKED STUDY NOTES</span><ul class="notes-list">${t.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul><div class="notice">Try explaining this topic out loud, then check the material. What example would you use?</div><label class="field">Your own summary<textarea id="personal-note" data-note-topic="${esc(id)}" rows="4" placeholder="Put the idea in your own words…">${esc(t.personalNote || "")}</textarea></label><div class="button-row"><button class="secondary" data-source-doc="${esc(t.documentId)}" data-page="${t.page}">Check source · p${t.page}</button><button class="primary" data-practise-topic="${esc(id)}">Practise this topic <span>↗</span></button></div>`,
  );
}
function beginPractice(mode, topicId) {
  const c = course(),
    topics = topicId ? c.topics.filter((t) => t.id === topicId) : c.topics;
  let cards = topics.flatMap((t) => t.cards);
  if (!cards.length) {
    api.toast("Add course material to create practice cards.");
    return;
  }
  cards = cards
    .map((card) => {
      const last = db.attempts.filter((a) => a.cardId === card.id).at(-1);
      return { card, last };
    })
    .sort((a, b) => (a.last?.next || "").localeCompare(b.last?.next || ""))
    .map((x) => x.card)
    .slice(0, 10);
  practice = {
    mode,
    cards,
    index: 0,
    answered: false,
    revealed: false,
    correct: 0,
  };
  showPractice();
}
function showPractice() {
  if (!practice) return;
  const p = practice,
    c = p.cards[p.index];
  if (!c) {
    api.modal(
      `${api.header("A little more familiar.")}<div class="focus-clock">${p.correct}<span style="font-size:30px"> / ${p.cards.length}</span></div><p class="focus-note">${p.mode === "quiz" ? "Correct answers in this quiz. Your progress view is updated." : "Cards you rated “recalled”. Self-ratings are kept separate from quiz evidence."}</p><div class="button-row"><button class="secondary" data-campus="readiness">See my progress</button><button class="primary" data-campus="quiz">Another practice round <span>↗</span></button></div>`,
    );
    return;
  }
  api.modal(
    `${api.header(p.mode === "quiz" ? "Pull it from memory." : "Give the idea a moment.")}<div class="card-head"><span class="tag">${p.mode === "quiz" ? "RECALL QUIZ" : "FLASHCARD"}</span><span class="subtext">${p.index + 1} / ${p.cards.length}</span></div><div class="quiz-question">${esc(c.question)}</div>${p.mode === "quiz" ? `<form id="quiz-form"><label class="field">The missing term<input name="answer" autocomplete="off" required ${p.answered ? "disabled" : ""} placeholder="Type the term from your notes"></label><button class="primary" type="submit" ${p.answered ? "disabled" : ""}>Check my answer <span>↗</span></button></form>` : `<button class="primary" data-campus="reveal" ${p.revealed ? "disabled" : ""}>Reveal answer <span>↗</span></button>`}<div id="answer-feedback" aria-live="polite"></div>${p.mode === "flash" && p.revealed ? flashAnswer(c) : ""}<p class="hint">Exact term recall, ignoring case and punctuation. This is a draft question from your material.</p>`,
  );
}
function flashAnswer(c) {
  return `<div class="notice"><strong>${esc(c.answer)}</strong><p>${esc(c.source)}</p><span class="hint">Source · page ${c.page}</span></div><div class="button-row"><button class="secondary" data-rating="0">Need another look</button><button class="primary" data-rating="1">I recalled it <span>✓</span></button></div>`;
}
function record(correct) {
  const p = practice,
    c = p.cards[p.index];
  db.attempts.push({
    cardId: c.id,
    topicId: c.topicId,
    courseId: course().id,
    mode: p.mode === "quiz" ? "quiz" : "flash",
    correct,
    date: new Date().toISOString(),
    next: nextReview(db.attempts, c.id, correct),
  });
  db.attempts = db.attempts.slice(-2000);
  p.correct += correct ? 1 : 0;
  p.answered = true;
  persist();
  api.render();
}
function guide() {
  api.modal(
    `${api.header("Build your thinking, not a shortcut.")}<form id="guide-form"><label class="field">Paste your assignment brief<textarea name="brief" rows="7" minlength="30" maxlength="10000" required placeholder="Paste the requirements, deliverables and rubric here…"></textarea></label><p class="subtext">You’ll get a process checklist and questions to answer yourself. The guide won’t write your submission or claim to know your marking rubric.</p><button class="primary" type="submit">Unpack the work <span>↗</span></button></form>`,
  );
}
function courseForm(existing = false) {
  const c = existing ? course() : null;
  api.modal(
    `${api.header(existing ? "A goal worth making room for." : "A new course. A fresh page.")}<form id="course-form" data-existing="${existing}"><label class="field">Course name<input name="name" maxlength="100" required value="${esc(c?.name || "")}" placeholder="e.g. Introduction to psychology"></label><label class="field">Learning goal<input name="goal" maxlength="180" required value="${esc(c?.goal || "")}" placeholder="e.g. Explain core concepts without my notes"></label><label class="field">Target exam date (optional)<input name="exam" type="text" inputmode="numeric" placeholder="DD/MM/YY" pattern="[0-9]{2}/[0-9]{2}/[0-9]{2}" value="${numericDate(c?.exam || "")}"></label><button class="primary" type="submit">${existing ? "Save goal" : "Create course"} <span>↗</span></button></form>`,
  );
}
function reminder() {
  api.modal(
    `${api.header("A gentle nudge, on your terms.")}<form id="reminder-form"><label class="field">Remind me at<input type="datetime-local" name="when" required></label><p class="subtext">The app can notify you while this page is open. For a reminder when the app is closed, download the calendar reminder and import it into your calendar.</p><p id="reminder-error" class="error" role="alert"></p><div class="button-row"><button type="button" class="secondary" data-campus="notifications">Enable browser notifications</button><button type="submit" class="primary">Save & download reminder <span>↗</span></button></div></form>`,
  );
}
export function initCampus(a) {
  api = a;
  document.addEventListener("change", (e) => {
    if (e.target.id === "course-select") {
      db.selected = e.target.value;
      persist();
      api.render();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.dataset.noteTopic) {
      const t = course().topics.find(
        (t) => t.id === e.target.dataset.noteTopic,
      );
      if (t) {
        t.personalNote = e.target.value.slice(0, 10000);
        persist();
      }
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.sourceDoc) {
      source(b.dataset.sourceDoc, Number(b.dataset.page) || 1);
      return;
    }
    if (b.dataset.topic) {
      notes(b.dataset.topic);
      return;
    }
    if (b.dataset.practiseTopic) {
      beginPractice("quiz", b.dataset.practiseTopic);
      return;
    }
    if (b.dataset.planTopic) {
      const t = course().topics.find((t) => t.id === b.dataset.planTopic);
      api.addTasks(
        [
          {
            sourceTopic: t.id,
            title: `Review: ${t.title}`,
            estimate: 20,
            note: `Recall ${t.cards.length} key ideas from ${course().name}, then check the source on page ${t.page}.`,
          },
        ],
        course(),
      );
      return;
    }
    if (b.dataset.rating !== undefined && practice && !practice.answered) {
      record(b.dataset.rating === "1");
      practice.index++;
      practice.answered = false;
      practice.revealed = false;
      showPractice();
      return;
    }
    switch (b.dataset.campus) {
      case "plan-course":
        api.addTasks(
          course().topics.map((t) => ({
            sourceTopic: t.id,
            title: `Study: ${t.title}`,
            estimate: 20,
            note: `Recall the ideas, complete practice questions, then check source page ${t.page}.`,
          })),
          course(),
        );
        break;
      case "new-course":
        courseForm();
        break;
      case "course-goal":
        courseForm(true);
        break;
      case "upload":
        uploadModal();
        break;
      case "sample": {
        const id = crypto.randomUUID(),
          docId = crypto.randomUUID(),
          pages = [{ page: 1, text: SAMPLE }];
        db.courses.push({
          id,
          name: "Design & society",
          goal: "Explain and apply the principles of human-centred design",
          exam: addDays(iso(), 14),
          documents: [
            {
              id: docId,
              name: "Design foundations · sample notes",
              pages,
              kind: "sample",
            },
          ],
          topics: extractStudyMaterial(pages, docId),
        });
        db.selected = id;
        persist();
        api.render();
        break;
      }
      case "sample-pdf": {
        if (uploading) break;
        uploading = true;
        try {
          const response = await fetch("./samples/learning-foundations.pdf");
          if (!response.ok) throw Error("Sample PDF could not be loaded.");
          const file = new File(
              [await response.blob()],
              "Learning foundations.pdf",
              { type: "application/pdf" },
            ),
            pages = await readDocument(file),
            id = crypto.randomUUID(),
            topics = extractStudyMaterial(pages, id);
          if (!topics.length) throw Error("No topics found in the sample.");
          course().documents.push({
            id,
            name: "Learning foundations · sample PDF",
            pages,
            kind: "sample",
          });
          course().topics.push(...topics);
          persist();
          api.close();
          api.render();
          api.toast("Sample PDF extracted into " + topics.length + " topic.");
        } catch (err) {
          api.toast(err.message);
        } finally {
          uploading = false;
        }
        break;
      }
      case "quiz":
        beginPractice("quiz");
        break;
      case "flashcards":
        beginPractice("flash");
        break;
      case "reveal":
        if (practice) {
          practice.revealed = true;
          showPractice();
        }
        break;
      case "next-question":
        if (practice?.answered) {
          practice.index++;
          practice.answered = false;
          showPractice();
        }
        break;
      case "readiness":
        api.close();
        api.navigate("readiness");
        break;
      case "guide":
        guide();
        break;
      case "reminder":
        reminder();
        break;
      case "notifications":
        if (!("Notification" in window)) {
          api.toast(
            "Browser notifications are unavailable here. Use a calendar reminder.",
          );
          break;
        }
        try {
          const permission = await Notification.requestPermission();
          api.toast(
            permission === "granted"
              ? "Notifications enabled while this page is open."
              : "Use a calendar reminder for reliable alerts.",
          );
        } catch {
          api.toast("Notifications unavailable. Use a calendar reminder.");
        }
        break;
      case "guide-add":
        api.addTasks([
          {
            title: "Decode the brief and rubric",
            estimate: 20,
            note: "Identify deliverables, constraints and the evidence each criterion needs.",
          },
          {
            title: "Gather and compare evidence",
            estimate: 45,
            note: "Find credible sources and compare alternative explanations.",
          },
          {
            title: "Build your own argument",
            estimate: 30,
            note: "Write a claim and three supporting points in your own words.",
          },
          {
            title: "Create and review your draft",
            estimate: 90,
            note: "Draft the submission yourself, then check every requirement.",
          },
        ]);
        api.close();
        break;
    }
  });
  document.addEventListener("submit", async (e) => {
    const f = e.target,
      d = new FormData(f);
    if (f.id === "course-form") {
      e.preventDefault();
      const name = String(d.get("name")).trim(),
        goal = String(d.get("goal")).trim();
      if (!name || !goal) return;
      const exam = d.get("exam") ? parseNumericDate(String(d.get("exam"))) : "";
      if (d.get("exam") && (!exam || exam < iso())) {
        api.toast("Enter a real future date as DD/MM/YY.");
        return;
      }
      let c = f.dataset.existing === "true" ? course() : null;
      if (c) {
        Object.assign(c, { name, goal, exam });
      } else {
        c = {
          id: crypto.randomUUID(),
          name,
          goal,
          exam,
          documents: [],
          topics: [],
        };
        db.courses.push(c);
      }
      db.selected = c.id;
      persist();
      api.close();
      api.navigate("library");
    }
    if (f.id === "material-form") {
      e.preventDefault();
      if (uploading) return;
      uploading = true;
      const target = course();
      try {
        const text = String(d.get("text")).trim(),
          file = d.get("file");
        if (!text && !file?.size)
          throw Error("Upload a file or paste some course material.");
        $("#upload-submit").disabled = true;
        $("#upload-status").textContent = "Turning material into small topics…";
        const pages = text
            ? [{ page: 1, text }]
            : await readDocument(file, (m) => {
                if ($("#upload-status")) $("#upload-status").textContent = m;
              }),
          id = crypto.randomUUID(),
          topics = extractStudyMaterial(pages, id);
        if (!topics.length)
          throw Error(
            "Not enough readable sentences. Try clearer notes with headings and full sentences.",
          );
        if (target.topics.length + topics.length > 120)
          throw Error(
            "This course has reached 120 topics. Create another course for additional material.",
          );
        target.documents.push({
          id,
          name: String(d.get("title")).trim() || file?.name || "Pasted notes",
          pages,
          kind: "upload",
        });
        target.topics.push(...topics);
        persist();
        api.close();
        api.render();
        api.toast(
          `${topics.length} topics created.${topics.length === 60 ? " The 60-topic limit was reached; later material may not be represented. Import smaller sections for full coverage." : ""} Review their source-linked notes before practising.`,
        );
      } catch (err) {
        if ($("#upload-error")) $("#upload-error").textContent = err.message;
        if ($("#upload-submit")) $("#upload-submit").disabled = false;
      } finally {
        uploading = false;
      }
    }
    if (f.id === "quiz-form") {
      e.preventDefault();
      if (!practice || practice.answered) return;
      const c = practice.cards[practice.index],
        normal = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      const correct = normal(String(d.get("answer"))) === normal(c.answer);
      record(correct);
      f.querySelector("input").disabled = true;
      f.querySelector("button").disabled = true;
      $("#answer-feedback").innerHTML =
        `<div class="notice ${correct ? "" : "warning"}"><strong>${correct ? "You’ve got it." : "A useful thing to revisit."}</strong><p>The term is <strong>${esc(c.answer)}</strong>.</p><p>${esc(c.source)}</p><span class="hint">Source · page ${c.page}. Review scheduled for ${dateLabel(db.attempts.at(-1).next)}.</span></div><button class="primary" data-campus="next-question">${practice.index + 1 === practice.cards.length ? "See my results" : "Next question"} <span>↗</span></button>`;
    }
    if (f.id === "guide-form") {
      e.preventDefault();
      const brief = String(d.get("brief")),
        verbs = [
          ...new Set(
            (
              brief.match(
                /\b(analyse|analyze|compare|evaluate|design|discuss|justify|reflect|explain|demonstrate|critique)\b/gi,
              ) || []
            ).map((v) => v.toLowerCase()),
          ),
        ];
      api.modal(
        `${api.header("Here’s how to approach it.")}<span class="tag">PROCESS GUIDE · YOU CREATE THE SUBMISSION</span><div class="notice">${verbs.length ? `Your brief asks you to: ${esc(verbs.join(", "))}.` : "Start by identifying what the brief asks you to produce."} Verify the checklist against your full rubric.</div><ol class="notes-list"><li><strong>Decode the brief.</strong> What must you submit? Highlight the deadline, format, word limit and criteria.</li><li><strong>Find the question underneath.</strong> Who or what is affected? What would a convincing answer establish?</li><li><strong>Gather evidence.</strong> Which sources support your view? What challenges it?</li><li><strong>Compare alternatives.</strong> What are their strengths, limits and trade-offs?</li><li><strong>Make your argument.</strong> Write your own claim, support and reasoning. What is missing?</li><li><strong>Review.</strong> Can you point to evidence for every requirement? Check citations and submission details.</li></ol><details><summary>Your original brief</summary><p class="source-text">${esc(brief)}</p></details><button class="primary" data-campus="guide-add">Add a draft checklist to my plan <span>↗</span></button><p class="hint">Adds 185 estimated minutes. Adjust each estimate and the deadline yourself.</p>`,
      );
    }
    if (f.id === "reminder-form") {
      e.preventDefault();
      const time = new Date(String(d.get("when")));
      if (!Number.isFinite(+time) || +time <= Date.now()) {
        $("#reminder-error").textContent = "Choose a future time.";
        return;
      }
      db.reminder = {
        when: time.toISOString(),
        title: `Study ${course()?.name || "your next step"}`,
      };
      persist();
      const stamp = (t) =>
          t
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}/, ""),
        safe = db.reminder.title.replace(/[\r\n,;\\]/g, " ");
      api.download(
        "restrive-reminder.ics",
        [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//ReStrive//Study reminder//EN",
          "BEGIN:VEVENT",
          `UID:${crypto.randomUUID()}@again.local`,
          `DTSTAMP:${stamp(new Date())}`,
          `DTSTART:${stamp(time)}`,
          `DTEND:${stamp(new Date(+time + 20 * 60000))}`,
          `SUMMARY:${safe}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT5M",
          "ACTION:DISPLAY",
          "DESCRIPTION:Your next small study step",
          "END:VALARM",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n"),
        "text/calendar",
      );
      api.close();
      api.toast(
        "Reminder saved. Import the calendar file for alerts when the app is closed.",
      );
    }
  });
  setInterval(() => {
    if (db.reminder && Date.parse(db.reminder.when) <= Date.now()) {
      const title = db.reminder.title;
      db.reminder = null;
      persist();
      api.toast(title + " — a small step still counts.");
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("ReStrive · time for your next step", {
          body: title,
          icon: "./favicon.svg",
        });
    }
  }, 15000);
}
const $ = (s) => document.querySelector(s);
