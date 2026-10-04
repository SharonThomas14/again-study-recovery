import { iso, addDays, dateLabel } from "./planner.js";
import { parseHours, hourInput } from "./calendar-availability.js";
import {
  extractStudyMaterial,
  extractDistributedTopics,
  MAX_MATERIAL_BYTES,
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
  uploading = false,
  libraryOpenCourse = false,
  selectingTopics = false,
  selectedTopicIds = new Set();
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
export function campusDates() {
  return db.courses.flatMap((c) => [
    ...(c.deadline ? [{ date: c.deadline, title: `${c.name} deadline`, type: "Task", source: c.name }] : []),
    ...(c.exam ? [{ date: c.exam, title: `${c.name} exam`, type: "Exam", source: c.name }] : []),
  ]);
}
export function campusExport() {
  return db;
}
export function showCourseProjects() {
  libraryOpenCourse = false;
  selectingTopics = false;
  selectedTopicIds.clear();
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
  if (typeof indexedDB !== "undefined") indexedDB.deleteDatabase("again.course-files.v1");
}
function fileStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("again.course-files.v1", 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("files")) request.result.createObjectStore("files");
      if (!request.result.objectStoreNames.contains("pages")) request.result.createObjectStore("pages");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error("File storage is unavailable in this browser."));
  });
}
async function putPdf(id, file, pages) {
  const db = await fileStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["files", "pages"], "readwrite");
    tx.objectStore("files").put(file, id);
    tx.objectStore("pages").put(pages, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(Error("Could not save this PDF on your device. Check available browser storage.")); };
  });
}
async function getPages(id) {
  const db = await fileStore();
  return new Promise((resolve, reject) => {
    const request = db.transaction("pages", "readonly").objectStore("pages").get(id);
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(Error("Could not read this PDF’s extracted text.")); };
  });
}
async function removeStored(id) {
  const db = await fileStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["files", "pages"], "readwrite");
    tx.objectStore("files").delete(id);
    tx.objectStore("pages").delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(Error("Could not remove the saved file from this device.")); };
  });
}
async function putFile(id, file) {
  const db = await fileStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(Error("Could not save this file on your device.")); };
  });
}
async function openFile(id, name) {
  const db = await fileStore();
  const file = await new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const request = tx.objectStore("files").get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error("Could not open this file."));
  });
  db.close();
  if (!file) throw Error("File not found on this device.");
  const url = URL.createObjectURL(file);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function tools(view) {
  return `<div class="plan-toolbar"><div>${view === "library" ? '<button class="text-button" data-campus="all-courses">← Your projects</button>' : `<div class="course-select"><label for="course-select">COURSE</label><select id="course-select">${db.courses.map((c) => `<option value="${esc(c.id)}" ${c.id === course()?.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>`}</div><div><button class="secondary" data-campus="new-course">+ New course</button><button class="secondary" data-campus="upload" ${!course() ? "disabled" : ""}>Add materials ↗</button></div></div>`;
}
function courseProjects() {
  return `<div class="eyebrow">YOUR COURSES, IN ONE PLACE</div><div class="section-title"><h1 class="large-heading">Your projects</h1><button class="secondary" data-campus="new-course">+ New course</button></div><p class="subtext">Choose a course to see its materials, study topics, quizzes and flashcards.</p><div class="course-project-grid">${db.courses.map((c) => {
    const cards = c.topics.reduce((sum, topic) => sum + topic.cards.length, 0);
    return `<button class="course-project-card" data-campus="open-course" data-course-id="${esc(c.id)}"><span class="eyebrow">COURSE / PROJECT</span><h2>${esc(c.name)}</h2><p>${esc(c.goal || "Add a learning goal for this course.")}</p><span class="course-project-meta">${c.documents.length} ${c.documents.length === 1 ? "material" : "materials"} · ${c.topics.length} ${c.topics.length === 1 ? "topic" : "topics"} · ${cards} practice cards</span><span class="course-project-link">Open course ↗</span></button>`;
  }).join("")}</div>`;
}
function empty() {
  return `<section class="empty-state"><div class="eyebrow">A PLACE FOR WHAT YOU’RE LEARNING</div><h1 class="large-heading">From material<br>to making sense of it.</h1><p class="subtext">Bring a course, a few pages, and a little curiosity.<br>Leave with topics, source-linked notes and something to practise.</p><div class="button-row" style="justify-content:center"><button class="secondary" data-campus="sample">Explore a sample course</button><button class="primary" style="flex:0 1 220px" data-campus="new-course">Create a course <span>↗</span></button></div></section>`;
}
export function campusScreen(view) {
  const c = course();
  if (view === "library" && db.courses.length && !libraryOpenCourse) return courseProjects();
  if (!c) {
    if (view === "readiness") {
      const p = api.projectSummary();
      return `<div class="eyebrow">YOUR LEARNING, IN VIEW</div><h1 class="large-heading">Learning progress</h1><div class="learning-summary"><div><b>${p.done}/${p.total}</b><span>tasks done</span></div><div><b>${Math.ceil(p.hours * 10) / 10}h</b><span>hours needed</span></div></div><p class="subtext">Create a course to set a learning goal and track practice.</p><button class="primary" data-campus="new-course">+ New course</button>`;
    }
    return empty();
  }
  const score = scoreReadiness(c.topics, db.attempts);
  return `${persistenceFailed ? '<div class="notice warning">Device storage is full. Recent changes are only in memory. Export a backup before closing.</div>' : ""}<div class="eyebrow">${view === "readiness" ? "YOUR LEARNING, IN VIEW" : "YOUR COURSE / PROJECT"}</div><h1 class="large-heading">${view === "readiness" ? "Know what needs another look." : esc(c.name)}</h1><p class="subtext">${view === "readiness" ? "Evidence from your practice, not a prediction of your exam grade." : esc(c.goal || "Understand it. Practise it. Make room for it.")}</p>${c.deadline ? `<p class="subtext">Course deadline: ${dateLabel(c.deadline)}</p>` : ""}${tools(view)}${view === "readiness" ? dashboard(c, score) : library(c)}`;
}
function documentShelfItem(doc) {
  const count = doc.pageCount ?? doc.pages.length;
  const detail = doc.kind === "attachment" ? "Saved file" : `${count} ${count === 1 ? "page" : "pages"}`;
  return `<div class="document-item"><button class="document-tile" data-source-doc="${esc(doc.id)}"><span>▤</span><div><strong>${esc(doc.name)}</strong><small>${detail} · ${doc.kind === "sample" ? "SAMPLE MATERIAL" : "ADDED BY YOU"}</small></div><span>↗</span></button><button class="document-remove" data-campus="remove-material" data-doc-id="${esc(doc.id)}" aria-label="Remove ${esc(doc.name)}">Remove</button></div>`;
}
function library(c) {
  const hasPractice = c.topics.some((topic) => topic.cards.length);
  const selectedCount = c.topics.filter((topic) => selectedTopicIds.has(topic.id)).length;
  return `<div class="learning-summary"><div><b>${c.documents.length.toString().padStart(2, "0")}</b><span>materials</span></div><div><b>${c.topics.length.toString().padStart(2, "0")}</b><span>study topics</span></div><div><b>${c.topics
    .reduce((n, t) => n + t.cards.length, 0)
    .toString()
    .padStart(
      2,
      "0",
    )}</b><span>practice cards</span></div></div><div class="course-practice-actions"><button class="primary" data-campus="quiz" ${hasPractice ? "" : "disabled"}>Take a quiz ↗</button><button class="secondary" data-campus="flashcards" ${hasPractice ? "" : "disabled"}>Study flashcards ↗</button></div><div class="notice">Notes and questions are draft excerpts from your materials. Check the source before relying on them. Files and extracted notes stay on this device. Original uploaded files are not included in JSON backups. PDF, TXT and Markdown create practice topics; other file types are saved as attachments.</div><div class="section-title"><h2>Course materials</h2><button class="text-button" data-campus="upload">+ Add material</button></div>${c.documents.length ? `<div class="document-shelf">${c.documents.map(documentShelfItem).join("")}</div>` : `<div class="empty-state"><h2>Your next chapter starts here.</h2><button class="secondary" data-campus="upload">Add your first material ↗</button></div>`}<div class="section-title"><h2>Topics to study</h2><div><button class="text-button" data-campus="new-topic">+ Create topic</button>${c.topics.length ? `<button class="text-button" data-campus="plan-course">Turn topics into a study plan ↗</button><button class="text-button" data-campus="select-topics">${selectingTopics ? "Done selecting" : "Select topics"}</button>` : ""}</div></div>${c.topics.length && selectingTopics ? `<div class="topic-selection-bar" role="group" aria-label="Selected topics"><strong>${selectedCount} selected</strong><button class="text-button" data-campus="select-all-topics">Select all</button><button class="text-button" data-campus="clear-topic-selection" ${selectedCount ? "" : "disabled"}>Clear</button><button class="secondary" data-campus="edit-selected-topics" ${selectedCount ? "" : "disabled"}>Edit selected</button><button class="secondary" data-campus="remove-selected-topics" ${selectedCount ? "" : "disabled"}>Remove selected</button></div>` : ""}${c.topics.length ? `<div class="topic-grid">${c.topics
    .map((t, i) => {
      const s = scoreReadiness([t], db.attempts);
      return `<article class="topic-card ${selectedTopicIds.has(t.id) && selectingTopics ? "topic-card-selected" : ""}">${selectingTopics ? `<label class="topic-select"><input type="checkbox" data-select-topic="${esc(t.id)}" aria-label="Select ${esc(t.title)}" ${selectedTopicIds.has(t.id) ? "checked" : ""}> Select topic</label>` : ""}<div class="card-head"><span class="eyebrow">${String(i + 1).padStart(2, "0")} / TOPIC</span><span class="tag">${s.correct}/${s.total} checked</span></div><h2>${esc(t.title)}</h2><p>${esc(t.notes[0])}</p><span class="topic-hours">${hourInput((t.studyMinutes ?? 30))}h planned</span><div class="topic-actions"><button class="text-button" data-topic="${esc(t.id)}">Open study notes ↗</button><button class="tiny-round" data-practise-topic="${esc(t.id)}" aria-label="Practise ${esc(t.title)}" ${t.cards.length ? "" : "disabled"}>→</button></div><div class="topic-management"><button data-campus="edit-topic" data-topic-id="${esc(t.id)}" aria-label="Edit ${esc(t.title)}">Edit topic</button><button data-campus="remove-topic" data-topic-id="${esc(t.id)}" aria-label="Remove ${esc(t.title)}">Remove</button></div></article>`;
    })
    .join(
      "",
    )}</div>` : '<p class="subtext">Upload a text-based PDF, TXT or Markdown file, paste notes, or create a topic manually.</p>'}<div class="study-practice"><div><span class="eyebrow">PRACTISE WHAT YOU LEARNED</span><h2>Ready to check your understanding?</h2><p class="subtext">Use a quiz to test recall, or flip through flashcards at your own pace.</p></div><div class="study-practice-actions"><button class="primary" data-campus="quiz" ${hasPractice ? "" : "disabled"}>Take a quiz ↗</button><button class="secondary" data-campus="flashcards" ${hasPractice ? "" : "disabled"}>Study flashcards ↗</button></div></div><div class="guide-banner"><div><span class="eyebrow">THINK IT THROUGH. DON’T HAND IT OVER.</span><h2>An assignment guide, not an answer machine.</h2><p class="subtext">Bring your brief. Build your own argument, one step at a time.</p></div><button class="secondary" data-campus="guide">Unpack my assignment ↗</button></div>`;
}
function dashboard(c, s) {
  const progress = api.projectSummary();
  const days = c.exam
    ? Math.max(
        0,
        Math.round((Date.parse(c.exam) - Date.parse(iso())) / 86400000),
      )
    : null;
  return `<div class="learning-summary"><div><b>${progress.done}/${progress.total}</b><span>tasks done</span></div><div><b>${Math.ceil(progress.hours * 10) / 10}h</b><span>hours needed</span></div></div><div class="readiness-grid"><div class="readiness-panel"><span class="eyebrow">PRACTICE COVERAGE</span><div class="readiness-number">${s.confidence}<span>%</span></div><p>${s.correct} of ${s.total} questions answered correctly on the latest quiz attempt.</p><div class="progress-track"><i style="width:${s.confidence}%"></i></div><p class="hint">${s.attempted} distinct questions attempted. ${s.total - s.attempted} untested. Flashcard self-ratings do not count as quiz evidence.</p></div><div class="exam-panel"><span class="eyebrow">THE GOAL AHEAD</span><h2>${c.exam ? dateLabel(c.exam) : "Give your learning a date."}</h2><p class="subtext">${days !== null ? `${days} days until your target exam date.` : "Set a target exam date and learning goal."}</p><p>${esc(c.goal || "Build understanding, one topic at a time.")}</p><button class="secondary" data-campus="course-goal">Edit learning goal ↗</button><button class="text-button" data-campus="reminder">Set a study reminder</button></div></div><div class="notice ${s.attempted < 5 ? "warning" : ""}">${s.attempted < 5 ? "Not enough practice evidence yet. Try at least five different questions before interpreting this picture." : "A correct cloze answer is evidence of recall on this material, not proof of understanding the whole course. Keep using past papers and application questions."}</div><div class="section-title"><h2>Choose what to study next.</h2><button class="text-button" data-campus="quiz">Start a quiz ↗</button></div><div class="readiness-rows">${c.topics
    .map((t) => {
      const ts = scoreReadiness([t], db.attempts);
      return `<div class="readiness-row"><div><strong>${esc(t.title)}</strong><p>${ts.correct}/${ts.total} correct · ${ts.total - ts.attempted} untested</p></div><div class="progress-track"><i style="width:${ts.confidence}%"></i></div><button class="secondary" data-plan-topic="${esc(t.id)}">Add ${hourInput(t.studyMinutes ?? 30)}h to plan ↗</button></div>`;
    })
    .join(
      "",
    )}</div><p class="hint">Adding a review task updates your assignment workload. Recheck capacity before accepting a recovery plan.</p>`;
}
function uploadModal() {
  api.modal(
    `${api.header("Bring your course to life.")}<p class="subtext">Try the import flow with <button class="text-button" data-campus="sample-pdf">our sample PDF ↗</button>, or add your own material below.</p><form id="material-form"><label class="field">Material title<input name="title" placeholder="e.g. Week 3 lecture notes" maxlength="120"></label><label class="field">Upload PDF, PowerPoint, Word, Excel, image, TXT or Markdown<input type="file" name="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt,.md"></label><p class="subtext">Or paste your notes. Use headings and blank lines to separate topics.</p><label class="field">Paste course material<textarea name="text" rows="7" maxlength="250000" placeholder="# Topic name&#10;A concept is…"></textarea></label><p class="hint">PDFs up to 600 pages and files up to 100 MB. Large PDFs may take several minutes to read. Practice topics sample the PDF; the original file is saved on this device. Scanned pages need OCR for practice topics.</p><p class="error" id="upload-error" role="alert"></p><p class="subtext" id="upload-status" role="status"></p><button type="submit" class="primary" id="upload-submit">Add material <span>↗</span></button></form>`,
  );
}
async function source(docId, page = 1) {
  const c = course(),
    d = c.documents.find((d) => d.id === docId);
  if (!d) return;
  let pages = d.pages;
  if (d.kind === "pdf") {
    try { pages = await getPages(docId); }
    catch (err) { api.toast(err.message); return; }
  }
  api.modal(
    `${api.header(esc(d.name))}<span class="tag">SOURCE MATERIAL · PAGE ${page}</span><div class="source-text">${esc(pages.find((p) => p.page === page)?.text || pages[0]?.text || "No readable text was found. Open the original PDF instead.")}</div><p class="hint">Extracted text. Layout and diagrams may not be preserved.</p>${d.kind === "pdf" ? `<button class="secondary" data-campus="download-material" data-doc-id="${esc(d.id)}">Download original PDF</button>` : ""}`,
  );
}
function notes(id) {
  const c = course(),
    t = c.topics.find((t) => t.id === id);
  if (!t) return;
  api.modal(
    `${api.header(esc(t.title))}<span class="tag">${t.manual ? "YOUR STUDY NOTES" : "SOURCE-LINKED STUDY NOTES"}</span><ul class="notes-list">${t.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul><div class="notice">Try explaining this topic out loud, then check the material. What example would you use?</div><label class="field">Your own summary<textarea id="personal-note" data-note-topic="${esc(id)}" rows="4" placeholder="Put the idea in your own words…">${esc(t.personalNote || "")}</textarea></label><div class="button-row">${t.documentId ? `<button class="secondary" data-source-doc="${esc(t.documentId)}" data-page="${t.page}">Check source · p${t.page}</button>` : ""}<button class="secondary" data-campus="edit-topic" data-topic-id="${esc(id)}">Edit topic</button>${t.cards.length ? `<button class="primary" data-practise-topic="${esc(id)}">Practise this topic <span>↗</span></button>` : ""}</div>`,
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
    `${api.header(existing ? "A goal worth making room for." : "A new course. A fresh page.")}<form id="course-form" data-existing="${existing}"><label class="field">Course name<input name="name" maxlength="100" required value="${esc(c?.name || "")}" placeholder="e.g. Introduction to psychology"></label><label class="field">Learning goal<input name="goal" maxlength="180" required value="${esc(c?.goal || "")}" placeholder="e.g. Explain core concepts without my notes"></label><label class="field">Target exam date (optional)<input name="exam" type="date" min="${iso()}" value="${esc(c?.exam || "")}"></label><label class="field">Course deadline (optional)<input name="deadline" type="date" value="${esc(c?.deadline || "")}"></label><button class="primary" type="submit">${existing ? "Save goal" : "Create course"} <span>↗</span></button></form>`,
  );
}
function topicForm(topicId = "") {
  const topic = course()?.topics.find((item) => item.id === topicId);
  const manual = !topic || topic.manual;
  api.modal(`${api.header(topic ? "Adjust this topic." : "Create a study topic.")}<form id="topic-form" data-topic-id="${esc(topicId)}"><label class="field">Topic name<input name="title" maxlength="120" required value="${esc(topic?.title || "")}" placeholder="e.g. Cell structure"></label><label class="field">Study notes<textarea name="notes" rows="6" maxlength="10000" required placeholder="Write the key ideas you want to study…">${esc(topic?.notes.join("\n\n") || "")}</textarea></label><label class="field">Study time (hours, 0.00)<input name="hours" type="number" min="0.01" max="50.00" step="0.01" required value="${hourInput(topic?.studyMinutes ?? 30)}"></label>${manual ? `<label class="field">Flashcard question (optional)<input name="question" maxlength="300" value="${esc(topic?.cards[0]?.question || "")}" placeholder="What should you recall?"></label><label class="field">Answer (optional)<input name="answer" maxlength="300" value="${esc(topic?.cards[0]?.answer || "")}" placeholder="The correct answer"></label><p class="hint">Add both fields to include this topic in quizzes and flashcards.</p>` : '<p class="hint">Existing practice questions still use excerpts from the uploaded material.</p>'}<p class="error" id="topic-error" role="alert"></p><div class="button-row"><button type="button" class="secondary" data-action="close">Cancel</button><button class="primary" type="submit">${topic ? "Save topic" : "Create topic"} <span>↗</span></button></div></form>`);
}
function selectedTopics() {
  return course()?.topics.filter((topic) => selectedTopicIds.has(topic.id)) || [];
}
function editSelectedTopics() {
  const topics = selectedTopics();
  if (!topics.length) return;
  api.modal(`${api.header(`Edit ${topics.length} selected ${topics.length === 1 ? "topic" : "topics"}.`)}<form id="bulk-topic-form"><p class="subtext">Adjust each topic below. Existing practice questions remain linked to their source material.</p><div class="bulk-topic-fields">${topics.map((topic, index) => `<fieldset class="bulk-topic-field"><legend>${index + 1}. ${esc(topic.title)}</legend><label class="field">Topic name<input name="title-${index}" maxlength="120" required value="${esc(topic.title)}"></label><label class="field">Study notes<textarea name="notes-${index}" rows="3" maxlength="10000" required>${esc(topic.notes.join("\n\n"))}</textarea></label><label class="field">Study time (hours, 0.00)<input name="hours-${index}" type="number" min="0.01" max="50.00" step="0.01" required value="${hourInput(topic.studyMinutes ?? 30)}"></label></fieldset>`).join("")}</div><p class="error" id="bulk-topic-error" role="alert"></p><div class="button-row"><button type="button" class="secondary" data-action="close">Cancel</button><button class="primary" type="submit">Save ${topics.length} ${topics.length === 1 ? "topic" : "topics"} <span>↗</span></button></div></form>`);
}
function removeTopics(topicIds) {
  const current = course();
  if (!current) return 0;
  const ids = new Set(topicIds);
  const removed = current.topics.filter((topic) => ids.has(topic.id));
  if (!removed.length) return 0;
  const cardIds = new Set(removed.flatMap((topic) => topic.cards.map((card) => card.id)));
  current.topics = current.topics.filter((topic) => !ids.has(topic.id));
  db.attempts = db.attempts.filter((attempt) => !cardIds.has(attempt.cardId));
  api.removeTopicTasks(current.id, [...ids]);
  practice = null;
  selectedTopicIds.clear();
  if (!current.topics.length) selectingTopics = false;
  persist();
  api.close();
  api.render();
  return removed.length;
}
function reminder() {
  api.modal(
    `${api.header("A gentle nudge, on your terms.")}<form id="reminder-form"><label class="field">Remind me at<input type="datetime-local" name="when" required></label><p class="subtext">The app can notify you while this page is open. For a reminder when the app is closed, download the calendar reminder and import it into your calendar.</p><p id="reminder-error" class="error" role="alert"></p><div class="button-row"><button type="button" class="secondary" data-campus="notifications">Enable browser notifications</button><button type="submit" class="primary">Save & download reminder <span>↗</span></button></div></form>`,
  );
}
export function initCampus(a) {
  api = a;
  document.addEventListener("change", (e) => {
    if (e.target.dataset.selectTopic) {
      const id = e.target.dataset.selectTopic;
      if (!selectingTopics || !course()?.topics.some((topic) => topic.id === id)) return;
      if (e.target.checked) selectedTopicIds.add(id);
      else selectedTopicIds.delete(id);
      api.render();
      return;
    }
    if (e.target.id === "course-select") {
      db.selected = e.target.value;
      selectingTopics = false;
      selectedTopicIds.clear();
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
      const doc = course()?.documents.find((d) => d.id === b.dataset.sourceDoc);
      if (doc?.kind === "attachment") {
        try { await openFile(doc.id, doc.filename || doc.name); } catch (err) { api.toast(err.message); }
      } else source(b.dataset.sourceDoc, Number(b.dataset.page) || 1);
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
            estimate: t.studyMinutes ?? 30,
            note: `Review this topic from ${course().name}${t.documentId ? `, then check source page ${t.page}` : " and your study notes"}.`,
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
      case "select-topics":
        selectingTopics = !selectingTopics;
        selectedTopicIds.clear();
        api.render();
        break;
      case "select-all-topics":
        course()?.topics.forEach((topic) => selectedTopicIds.add(topic.id));
        api.render();
        break;
      case "clear-topic-selection":
        selectedTopicIds.clear();
        api.render();
        break;
      case "edit-selected-topics":
        editSelectedTopics();
        break;
      case "remove-selected-topics": {
        const selected = selectedTopics();
        if (!selected.length) break;
        api.modal(`${api.header(`Remove ${selected.length} selected ${selected.length === 1 ? "topic" : "topics"}?`)}<p class="subtext">The selected topics, their quiz history and linked study-plan steps will be removed. Uploaded materials will stay in this course.</p><ul class="bulk-remove-list">${selected.map((topic) => `<li>${esc(topic.title)}</li>`).join("")}</ul><div class="button-row"><button class="secondary" data-action="close">Keep topics</button><button class="primary" data-campus="confirm-remove-selected-topics">Remove ${selected.length} ${selected.length === 1 ? "topic" : "topics"}</button></div>`);
        break;
      }
      case "confirm-remove-selected-topics": {
        const count = removeTopics(selectedTopics().map((topic) => topic.id));
        if (count) api.toast(`${count} ${count === 1 ? "topic" : "topics"} removed from this course.`);
        break;
      }
      case "new-topic":
        topicForm();
        break;
      case "edit-topic":
        topicForm(b.dataset.topicId);
        break;
      case "remove-topic": {
        const topic = course()?.topics.find((item) => item.id === b.dataset.topicId);
        if (!topic) break;
        api.modal(`${api.header("Remove this topic?")}<p class="subtext"><strong>${esc(topic.title)}</strong>, its quiz history and linked study-plan steps will be removed. The uploaded material will stay in this course.</p><div class="button-row"><button class="secondary" data-action="close">Keep topic</button><button class="primary" data-campus="confirm-remove-topic" data-topic-id="${esc(topic.id)}">Remove topic</button></div>`);
        break;
      }
      case "confirm-remove-topic": {
        const count = removeTopics([b.dataset.topicId]);
        if (count) api.toast("Topic removed from this course.");
        break;
      }
      case "open-course":
        if (db.courses.some((item) => item.id === b.dataset.courseId)) {
          db.selected = b.dataset.courseId;
          libraryOpenCourse = true;
          selectingTopics = false;
          selectedTopicIds.clear();
          persist();
          api.render();
        }
        break;
      case "all-courses":
        libraryOpenCourse = false;
        selectingTopics = false;
        selectedTopicIds.clear();
        api.render();
        break;
      case "remove-material": {
        const doc = course()?.documents.find((item) => item.id === b.dataset.docId);
        if (!doc) break;
        const count = course().topics.filter((topic) => topic.documentId === doc.id).length;
        api.modal(`${api.header("Remove this material?")}<p class="subtext"><strong>${esc(doc.name)}</strong> will be removed from this course.${count ? ` Its ${count} practice ${count === 1 ? "topic" : "topics"}, quiz history and linked study-plan steps will also be removed.` : ""}</p><div class="button-row"><button class="secondary" data-action="close">Keep file</button><button class="primary" data-campus="confirm-remove-material" data-doc-id="${esc(doc.id)}">Remove file</button></div>`);
        break;
      }
      case "confirm-remove-material": {
        const current = course();
        const doc = current?.documents.find((item) => item.id === b.dataset.docId);
        if (!doc) break;
        try {
          if (["pdf", "attachment"].includes(doc.kind)) await removeStored(doc.id);
          const removed = current.topics.filter((topic) => topic.documentId === doc.id);
          const cardIds = new Set(removed.flatMap((topic) => topic.cards.map((card) => card.id)));
          current.documents = current.documents.filter((item) => item.id !== doc.id);
          current.topics = current.topics.filter((topic) => topic.documentId !== doc.id);
          db.attempts = db.attempts.filter((attempt) => !cardIds.has(attempt.cardId));
          if (removed.length) api.removeTopicTasks(current.id, removed.map((topic) => topic.id));
          practice = null;
          persist();
          api.close();
          api.render();
          api.toast("Material removed. You can add another file.");
        } catch (err) { api.toast(err.message); }
        break;
      }
      case "download-material": {
        const doc = course()?.documents.find((item) => item.id === b.dataset.docId);
        if (doc) {
          try { await openFile(doc.id, doc.filename || doc.name); }
          catch (err) { api.toast(err.message); }
        }
        break;
      }
      case "plan-course":
        api.addTasks(
          course().topics.map((t) => ({
            sourceTopic: t.id,
            title: `Study: ${t.title}`,
            estimate: t.studyMinutes ?? 30,
            note: `Recall the ideas and complete practice questions${t.documentId ? `, then check source page ${t.page}` : " using your study notes"}.`,
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
        libraryOpenCourse = true;
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
    if (f.id === "bulk-topic-form") {
      e.preventDefault();
      const current = course();
      const topics = selectedTopics();
      if (!current || !topics.length) { api.close(); return; }
      const edits = topics.map((topic, index) => ({
        topic,
        title: String(d.get(`title-${index}`) || "").trim(),
        note: String(d.get(`notes-${index}`) || "").trim(),
        studyMinutes: parseHours(d.get(`hours-${index}`)),
      }));
      const invalid = edits.find((edit) => !edit.title || !edit.note || edit.studyMinutes === null);
      if (invalid) {
        f.querySelector("#bulk-topic-error").textContent = "Each topic needs a name, study notes and study hours from 0.01 to 50.00 with no more than two decimal places.";
        return;
      }
      for (const edit of edits) {
        edit.topic.title = edit.title;
        edit.topic.notes = [edit.note];
        edit.topic.studyMinutes = edit.studyMinutes;
        if (edit.topic.manual && edit.topic.cards.length) edit.topic.cards[0].source = edit.note;
        api.syncTopicTasks(current.id, edit.topic);
      }
      persist();
      api.close();
      api.render();
      api.toast(`${edits.length} ${edits.length === 1 ? "topic" : "topics"} updated.`);
      return;
    }
    if (f.id === "topic-form") {
      e.preventDefault();
      const current = course();
      const existing = current?.topics.find((item) => item.id === f.dataset.topicId);
      const title = String(d.get("title") || "").trim();
      const note = String(d.get("notes") || "").trim();
      const studyMinutes = parseHours(d.get("hours"));
      const question = String(d.get("question") || "").trim();
      const answer = String(d.get("answer") || "").trim();
      const error = !title || !note ? "Add a topic name and study notes." :
        studyMinutes === null ? "Enter study hours from 0.01 to 50.00, using no more than two decimal places." :
        Boolean(question) !== Boolean(answer) ? "Add both a flashcard question and its answer, or leave both blank." :
        !existing && current.topics.length >= 120 ? "This course has reached its 120-topic limit." : "";
      if (error) { f.querySelector("#topic-error").textContent = error; return; }
      const topic = existing || { id: crypto.randomUUID(), documentId: null, page: 1, notes: [], cards: [], manual: true };
      topic.title = title;
      topic.notes = [note];
      topic.studyMinutes = studyMinutes;
      if (topic.manual) {
        const oldCard = topic.cards[0];
        if (oldCard && (oldCard.question !== question || oldCard.answer !== answer))
          db.attempts = db.attempts.filter((attempt) => attempt.cardId !== oldCard.id);
        topic.cards = question && answer ? [{ id: oldCard?.id || `${topic.id}-manual-card`, topicId: topic.id, question, answer, source: note, page: 1, documentId: null }] : [];
      }
      if (!existing) current.topics.push(topic);
      if (existing) api.syncTopicTasks(current.id, topic);
      persist();
      api.close();
      api.render();
      api.toast(existing ? "Topic updated." : "Topic added to this course.");
      return;
    }
    if (f.id === "course-form") {
      e.preventDefault();
      const name = String(d.get("name")).trim(),
        goal = String(d.get("goal")).trim();
      if (!name || !goal) return;
      let c = f.dataset.existing === "true" ? course() : null;
      if (c) {
        Object.assign(c, { name, goal, exam: String(d.get("exam")), deadline: String(d.get("deadline")) });
      } else {
        c = {
          id: crypto.randomUUID(),
          name,
          goal,
          exam: String(d.get("exam")),
          deadline: String(d.get("deadline")),
          documents: [],
          topics: [],
        };
        db.courses.push(c);
      }
      db.selected = c.id;
      libraryOpenCourse = true;
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
        const extension = file?.name?.split(".").pop().toLowerCase();
        const attachOnly = !text && file?.size && !["pdf", "txt", "md"].includes(extension);
        if (file?.size && file.size > MAX_MATERIAL_BYTES) throw Error("Choose a file smaller than 100 MB.");
        if (attachOnly) {
          if (!["ppt", "pptx", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp", "gif"].includes(extension)) throw Error("Unsupported file type.");
          const id = crypto.randomUUID();
          await putFile(id, file);
          target.documents.push({ id, name: String(d.get("title")).trim() || file.name, filename: file.name, pages: [], kind: "attachment" });
          persist(); api.close(); api.render(); api.toast("Material saved to this course.");
          return;
        }
        const pages = text
            ? [{ page: 1, text }]
            : await readDocument(file, (m) => {
                if ($("#upload-status")) $("#upload-status").textContent = m;
              }),
          id = crypto.randomUUID(),
          isPdf = !text && extension === "pdf",
          topics = (isPdf ? extractDistributedTopics(pages, id) : extractStudyMaterial(pages, id))
            .slice(0, Math.max(0, 120 - target.topics.length));
        if (!topics.length && !isPdf)
          throw Error(
            "Not enough readable sentences. Try clearer notes with headings and full sentences.",
          );
        if (isPdf) {
          if ($("#upload-status")) $("#upload-status").textContent = "Saving PDF on this device…";
          await putPdf(id, file, pages);
        }
        target.documents.push({
          id,
          name: String(d.get("title")).trim() || file?.name || "Pasted notes",
          filename: isPdf ? file.name : undefined,
          pages: isPdf ? [] : pages,
          pageCount: pages.length,
          kind: isPdf ? "pdf" : "upload",
        });
        target.topics.push(...topics);
        if (!persist()) {
          target.documents.pop();
          target.topics.splice(-topics.length, topics.length);
          if (isPdf) await removeStored(id);
          throw Error("Browser storage is full. This material was not added.");
        }
        api.close();
        api.render();
        api.toast(
          isPdf && !topics.length
            ? "PDF saved. No readable text was found for practice topics. You can still download the original."
            : `${topics.length} topics created. Review their source-linked notes before practising.`,
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
          `UID:${crypto.randomUUID()}@restrive.local`,
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
          icon: "./restrive-logo.png",
        });
    }
  }, 15000);
}
const $ = (s) => document.querySelector(s);
