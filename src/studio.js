import {
  loadLocalAI,
  runLocalAI,
  localStatus,
  stopLocalAI,
} from "./local-ai.js";
import { readDocument } from "./learning.js";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let aiMode = "local";
let api,
  tab = "brief",
  access = "",
  busy = false,
  message = "",
  timer = null,
  tick = null;
const data = () => {
  const p = api.project();
  return (p.studio ||= {
    brief: "",
    rubric: "",
    notes: "",
    mode: "assignment",
    chat: [],
    report: "",
    slides: [],
    resources: {},
  });
};
export async function getConfig() {
  try {
    const r = await fetch("./api/config");
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}
const button = (action, label, cls = "secondary") =>
  `<button class="${cls}" data-studio="${action}">${label}</button>`;
function context() {
  const p = api.project(),
    s = data();
  return {
    title: p.title,
    course: p.course,
    goal: p.goal,
    deadline: p.deadline,
    mode: s.mode,
    brief: s.brief,
    rubric: s.rubric,
    studentNotes: s.notes,
    steps: p.tasks,
    currentMission:
      p.tasks.find((t) => t.id === s.selected) ||
      p.tasks.find((t) => t.completed < t.estimate),
    sources: Object.values(s.resources || {})
      .flat()
      .slice(0, 20),
    conversation: (s.chat || []).slice(-12),
  };
}
async function generate(role) {
  if (busy) return;
  const p = api.project(),
    s = data();
  if (!s.brief.trim())
    throw Error("Add your assignment brief or syllabus first.");
  busy = true;
  message = "Working with your brief and rubric…";
  api.render();
  try {
    let result;
    if (aiMode === "local") {
      result = await runLocalAI(role, context(), (partial) => {
        const el = document.querySelector(".studio-status");
        if (el) el.textContent = "Local AI is writing… " + partial.slice(-140);
      });
    } else {
      const response = await fetch("./api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access,
        },
        body: JSON.stringify({ role, context: context() }),
        signal: AbortSignal.timeout(65000),
      });
      if (
        response.status === 404 ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw Error(
          "This GitHub Pages edition has no AI server. Deploy the included Vercel backend and configure AI credentials to activate these agents.",
        );
      result = await response.json();
      if (!response.ok)
        throw Error(
          result.error || "The agent could not complete this request.",
        );
    }
    if (api.project().projectId !== p.projectId)
      throw Error(
        "The active project changed. Generation was discarded to keep contexts separate.",
      );
    if (role === "planner") {
      s.pending = result.steps;
      s.summary = result.summary;
      tab = "missions";
    }
    if (role === "report") s.report = result.text;
    if (role === "slides") s.slides = result.slides;
    if (role === "mentor") s.chat.push({ role: "mentor", text: result.text });
    api.save();
    message = "Ready for your review.";
  } catch (error) {
    message = error.message;
  } finally {
    busy = false;
    if (api.project().projectId === p.projectId) api.render();
  }
}
export function studioScreen() {
  const p = api.project(),
    s = data(),
    done = p.tasks.filter((t) => t.completed >= t.estimate).length;
  const steps = s.pending || p.tasks;
  return `<section class="studio-head"><div><span class="eyebrow">ASSIGNMENT STUDIO / YOUR LEARNING, IN MOTION</span><h1>From big brief.<br><em>To next move.</em></h1><p>${esc(p.title)} <span class="slash">/</span> ${done} of ${p.tasks.length} missions complete</p></div><div class="orbit-art" aria-hidden="true"><div class="orbit-ring"></div><div class="orbit-ring second"></div><span>✳</span><i></i></div></section><div class="studio-progress" aria-label="Mission progress"><i style="width:${p.tasks.length ? (done / p.tasks.length) * 100 : 0}%"></i></div><div class="studio-nav" role="navigation" aria-label="Assignment studio">${[
    ["brief", "01", "The brief"],
    ["missions", "02", "Missions"],
    ["mentor", "03", "Mentor"],
    ["report", "04", "Report"],
    ["slides", "05", "Slides"],
  ]
    .map(
      ([id, n, label]) =>
        `<button data-studio-tab="${id}" class="${tab === id ? "active" : ""}"><small>${n}</small>${label}</button>`,
    )
    .join(
      "",
    )}${button("settings", "AI engine ↗", "text-button")}</div><div class="studio-status ${busy ? "working" : ""}" role="status">${esc(message || "Local AI runs on your device after a one-time model download. Cloud AI is optional.")}</div>${busy ? button("stop-ai", "Stop generation", "text-button") : ""}<section class="studio-body">
 ${tab === "brief" ? `<div class="studio-columns"><div class="paper-panel"><span class="eyebrow">THE STARTING POINT</span><h2>Bring the whole brief.</h2><label class="field">What are we working on?<select data-studio-field="mode"><option value="assignment" ${s.mode === "assignment" ? "selected" : ""}>An assignment</option><option value="study" ${s.mode === "study" ? "selected" : ""}>A syllabus / exam study plan</option></select></label><label class="field">Assignment description or syllabus<textarea data-studio-field="brief" rows="9" maxlength="22000" placeholder="Paste the instructions, deliverables, learning outcomes and constraints…">${esc(s.brief)}</textarea></label><label class="secondary file-button">Upload brief or syllabus (PDF / TXT / MD)<input type="file" data-studio-upload="brief" accept=".pdf,.txt,.md" hidden></label><label class="field">Rubric / marking criteria<textarea data-studio-field="rubric" rows="6" maxlength="15000" placeholder="Include criterion descriptions and weights. The planner maps steps to these criteria.">${esc(s.rubric)}</textarea></label><label class="secondary file-button">Upload rubric<input type="file" data-studio-upload="rubric" accept=".pdf,.txt,.md" hidden></label><div class="button-row">${button("planner", busy ? "Planning…" : "Generate my missions ↗", "primary")}<button class="secondary" data-action="edit">Edit title & deadline</button></div></div><aside class="studio-aside"><span class="eyebrow">FOUR SPECIALISTS. ONE CONTEXT.</span><div class="agent-card"><b>01 / Planner</b><p>An editable action list. Review it against every rubric criterion.</p></div><div class="agent-card"><b>02 / Mentor</b><p>A hint when you need it, with your assignment in view.</p></div><div class="agent-card"><b>03 / Report editor</b><p>Turn your evidence and thinking into a draft you can own.</p></div><div class="agent-card"><b>04 / Presentation editor</b><p>Shape the story. Keep the slides editable.</p></div><p class="hint">Free local AI needs a one-time ~400 MB download and enough device memory. It is a small model: review its output carefully. Drafts need your review and must follow your course’s AI rules.</p><a href="https://www.rmit.edu.au/students/my-course/ai-in-learning" target="_blank" rel="noopener">RMIT’s AI in learning guidance ↗</a></aside></div>` : ""}
 ${tab === "missions" ? `<div class="section-title"><div><span class="eyebrow">${s.pending ? "AI PROPOSAL / NOT YET APPLIED" : "YOUR QUEST LOG"}</span><h2>One meaningful move at a time.</h2></div>${button("planner", "Replan with AI ↗")}</div>${s.summary ? `<p class="subtext">${esc(s.summary)}</p>` : ""}${s.pending ? `<div class="notice">Review every estimate and criterion. Applying replaces unfinished steps; completed steps are retained. ${button("apply", "Use these missions", "primary")} ${button("discard", "Discard proposal")}</div>` : ""}<div class="mission-list">${steps.map((t, i) => `<article class="mission-card" style="--order:${i}"><span class="mission-number">${String(i + 1).padStart(2, "0")}</span><div><input aria-label="Mission ${i + 1} title" data-mission="${i}" data-prop="title" value="${esc(t.title)}" maxlength="180"><textarea aria-label="Mission ${i + 1} guidance" data-mission="${i}" data-prop="note" rows="2">${esc(t.note || "")}</textarea>${t.rubric ? `<p class="rubric-chip">CRITERION / ${esc(t.rubric)}</p>` : ""}${t.deliverable ? `<p class="hint">Finish with: ${esc(t.deliverable)}</p>` : ""}<div class="mission-actions"><label>Minutes <input type="number" min="5" max="480" data-mission="${i}" data-prop="estimate" value="${t.estimate}" aria-label="Mission ${i + 1} minutes"></label>${!s.pending ? `<button class="text-button" data-mission-go="${esc(t.id)}">Work on this ↗</button><button class="text-button" data-mission-resources="${esc(t.id)}">Find resources ↗</button>` : ""}<button class="text-button" data-mission-up="${i}" ${i === 0 ? "disabled" : ""}>Move up ↑</button><button class="text-button" data-mission-delete="${i}">Delete</button></div>${(s.resources?.[t.id] || []).length ? `<div class="source-list">${s.resources[t.id].map((r) => `<a href="${esc(/^https:\/\/doi\.org\//.test(r.url) ? r.url : "https://search.crossref.org/")}" target="_blank" rel="noopener"><small>CROSSREF RECORD · ${esc(r.year || "")}</small>${esc(r.title)} ↗<span>${esc(r.authors || "")} · Metadata verified; read and assess relevance.</span></a>`).join("")}</div>` : ""}</div></article>`).join("")}</div><div class="button-row">${button("add", "+ Add a mission")}<button class="secondary" data-action="availability">Calendar & availability ↗</button><button class="secondary" data-view="today">Life interrupted? Recover ↗</button></div>` : ""}
 ${tab === "mentor" ? `<div class="studio-columns"><div class="paper-panel"><span class="eyebrow">THE FOCUS ROOM</span><h2>You don’t have to stay stuck.</h2><label class="field">Current mission<select data-studio-field="selected">${p.tasks.map((t) => `<option value="${esc(t.id)}" ${(s.selected || p.tasks.find((t) => t.completed < t.estimate)?.id) === t.id ? "selected" : ""}>${esc(t.title)}</option>`).join("")}</select></label><div class="focus-clock"><span id="studio-clock">${clockText()}</span><small>FOCUSED TIME · NO STREAK TO LOSE</small></div><div class="button-row">${button(timer ? "pause" : "start", timer ? "Pause timer" : "Start session ↗", "primary")}${button("log", "Log focused minutes")}</div><label class="field">Your working notes & evidence<textarea data-studio-field="notes" rows="9" maxlength="18000" placeholder="Record your reasoning, source quotes and page numbers, findings, or the part you’re stuck on. These notes inform your mentor and drafts.">${esc(s.notes)}</textarea></label></div><aside class="mentor-panel"><div class="section-title"><h3>Assignment mentor</h3><span class="tag">CONTEXT AWARE</span></div><p class="hint">Small local AI can make factual mistakes. Verify claims in your sources; never treat generated statistics as evidence.</p><div class="chat-log" aria-live="polite">${(s.chat || []).length ? s.chat.map((c) => `<div class="chat-message ${c.role === "student" ? "student" : ""}"><small>${c.role === "student" ? "YOU" : "MENTOR"}</small><p>${esc(c.text)}</p></div>`).join("") : '<div class="mentor-empty"><span>✳</span><p>Bring a question.<br>We’ll find the next move.</p></div>'}</div><form id="mentor-form"><label class="field">Ask about this assignment<textarea name="question" rows="3" maxlength="2000" required placeholder="I have two conflicting sources. How should I compare them?"></textarea></label><button class="primary" ${busy ? "disabled" : ""}>Ask mentor ↗</button></form><div class="val-handoff"><b>Studying at RMIT?</b><p>Copy a context brief and continue in official Val. This opens RMIT’s service; no account or conversation is connected.</p>${button("val", "Copy context for Val")} <a href="https://val.rmit.edu.au/" target="_blank" rel="noopener">Open Val ↗</a></div></aside></div>` : ""}
 ${tab === "report" ? `<div class="section-title"><div><span class="eyebrow">FROM EVIDENCE TO ARGUMENT</span><h2>A draft with room for your voice.</h2></div>${button("report", "Generate a draft ↗", "primary")}</div><p class="subtext">Uses your brief, rubric, notes and discovered source metadata. Check every claim and citation. Missing evidence stays visible.</p><textarea class="report-editor" data-studio-field="report" rows="24" maxlength="45000" aria-label="Editable report draft" placeholder="Write here, or generate a draft after adding your evidence in the Mentor tab.">${esc(s.report)}</textarea><div class="button-row">${button("docx", "Word / DOCX ↓")}${button("tex", "Overleaf / LaTeX ↓")}${button("report-pdf", "Print / save PDF ↗")}${button("markdown", "Plain text ↓")}</div><p class="hint">Upload the .tex file to Overleaf and select XeLaTeX. DOCX opens in Word or Google Docs. PDF uses your browser’s Save as PDF dialog.</p>` : ""}
 ${tab === "slides" ? `<div class="section-title"><div><span class="eyebrow">MAKE YOUR THINKING VISIBLE</span><h2>A story worth presenting.</h2></div>${button("slides", "Generate slide outline ↗", "primary")}</div><div class="slide-grid">${(s.slides || []).map((slide, i) => `<article class="slide-editor"><span class="eyebrow">SLIDE ${String(i + 1).padStart(2, "0")}</span><input data-slide="${i}" data-prop="title" value="${esc(slide.title)}" maxlength="160" aria-label="Slide ${i + 1} title"><textarea data-slide="${i}" data-prop="body" rows="5" maxlength="1000" aria-label="Slide ${i + 1} content">${esc(slide.body)}</textarea><details><summary>Speaker notes</summary><textarea data-slide="${i}" data-prop="notes" rows="4" maxlength="4000" aria-label="Slide ${i + 1} notes">${esc(slide.notes)}</textarea></details><button class="text-button" data-slide-delete="${i}">Remove slide</button></article>`).join("") || '<div class="empty-studio">Your story starts here. Generate from your assignment or add your own slides.</div>'}</div><div class="button-row">${button("add-slide", "+ Add slide")}${button("pptx", "PowerPoint / PPTX ↓")}${button("slides-pdf", "Print / save PDF ↗")}</div><p class="hint">Import the editable PPTX into Canva or Google Slides. Text boxes and speaker notes are preserved in the PPTX; imported rendering may vary.</p>` : ""}</section>`;
}
function clockText() {
  const s = data(),
    elapsed = (s.elapsed || 0) + (timer ? Date.now() - timer.started : 0);
  return (
    String(Math.floor(elapsed / 60000)).padStart(2, "0") +
    ":" +
    String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")
  );
}
function stopTimer() {
  if (timer) {
    timer.data.elapsed = (timer.data.elapsed || 0) + Date.now() - timer.started;
    timer = null;
    clearInterval(tick);
    api.save();
  }
}
function download(name, content, type) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function resources(id, query) {
  const p = api.project(),
    s = data(),
    t = p.tasks.find((t) => t.id === id);
  if (!t) return;
  message = "Searching Crossref for published research…";
  api.render();
  try {
    const q = query.trim().slice(0, 200);
    if (q.length < 3)
      throw Error("Use at least three characters in your research query.");
    t.query = q;
    const r = await fetch(
      "https://api.crossref.org/works?rows=4&query.bibliographic=" +
        encodeURIComponent(q),
      { signal: AbortSignal.timeout(15000) },
    );
    if (!r.ok) throw Error("Research search is temporarily unavailable.");
    const result = await r.json();
    s.resources ||= {};
    s.resources[id] = result.message.items
      .filter((x) => x.DOI && x.title?.[0])
      .map((x) => ({
        title: x.title[0],
        url: "https://doi.org/" + encodeURIComponent(x.DOI),
        year: x.issued?.["date-parts"]?.[0]?.[0],
        authors: (x.author || [])
          .slice(0, 3)
          .map((a) => [a.given, a.family].filter(Boolean).join(" "))
          .join(", "),
      }));
    api.save();
    message = s.resources[id].length
      ? "Research records found. These are discovery results, not an endorsement of quality or relevance."
      : "No matching research records. Try a more specific mission title.";
    api.modal(
      api.header("Explore resources for this mission") +
        `<p>${esc(q)}</p><p class="hint">Research records appear under your mission. These additional links open searches, not pre-verified recommendations.</p><div class="button-row"><a class="secondary" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q + " tutorial")}" target="_blank" rel="noopener">Search YouTube ↗</a><a class="secondary" href="https://www.google.com/search?q=${encodeURIComponent(q + " article tutorial")}" target="_blank" rel="noopener">Search articles & blogs ↗</a></div>`,
    );
  } catch (error) {
    message = error.message;
  }
  api.render();
}
function printDocument(slides) {
  const s = data(),
    w = window.open("", "_blank");
  if (!w) throw Error("Allow a pop-up to open the print preview.");
  w.document.write(
    `<!doctype html><html><head><title>${esc(api.project().title)}</title><style>body{font:12pt Georgia;padding:30px;color:#24271e}h1{font:32pt Arial}section{break-after:page;padding:35px}pre{font:inherit;white-space:pre-wrap;line-height:1.6}@media print{button{display:none}}${slides ? "@page{size:landscape}" : ""}</style></head><body><button onclick="window.print()">Print / save as PDF</button>${slides ? s.slides.map((x) => `<section><h1>${esc(x.title)}</h1><pre>${esc(x.body)}</pre></section>`).join("") : `<h1>${esc(api.project().title)}</h1><pre>${esc(s.report)}</pre>`}</body></html>`,
  );
  w.document.close();
}
export function initStudio(callbacks) {
  api = callbacks;
  document.addEventListener("input", (e) => {
    const el = e.target,
      s = data();
    if (el.dataset.studioField) {
      if (
        el.dataset.studioField === "selected" &&
        (timer || (s.elapsed || 0) > 0)
      ) {
        el.value = s.sessionTask || s.selected;
        api.toast("Log this session before changing its mission.");
        return;
      }
      s[el.dataset.studioField] = el.value;
      api.save();
    }
    if (el.dataset.mission !== undefined) {
      const t = (s.pending || api.project().tasks)[Number(el.dataset.mission)];
      if (el.dataset.prop === "estimate") {
        const n = Number(el.value);
        if (!Number.isInteger(n) || n < 5 || n > 480) return;
        t.estimate = Math.max(t.completed || 0, n);
      } else if (el.dataset.prop !== "title" || el.value.trim())
        t[el.dataset.prop] = el.value;
      api.save();
    }
    if (el.dataset.slide !== undefined) {
      s.slides[Number(el.dataset.slide)][el.dataset.prop] = el.value;
      api.save();
    }
  });
  document.addEventListener("change", async (e) => {
    if (!e.target.dataset.studioUpload) return;
    try {
      const file = e.target.files[0];
      if (!file) return;
      const pages = await readDocument(file);
      const text = pages.map((p) => p.text).join("\n\n");
      const field = e.target.dataset.studioUpload;
      const limit = field === "brief" ? 22000 : 15000;
      if (text.length > limit)
        throw Error(
          "The extracted text is too long. Upload a shorter excerpt or paste the relevant sections.",
        );
      data()[field] = text;
      api.save();
      api.render();
    } catch (error) {
      api.toast(error.message);
    }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "mentor-form") return;
    e.preventDefault();
    if (busy) return;
    const question = new FormData(e.target).get("question");
    data().chat ||= [];
    data().chat.push({ role: "student", text: question });
    api.save();
    try {
      await generate("mentor");
    } catch (error) {
      message = error.message;
      api.render();
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    try {
      if (b.dataset.studioTab) {
        tab = b.dataset.studioTab;
        message = "";
        api.render();
        return;
      }
      const s = data();
      if (b.dataset.missionGo) {
        if (timer || (s.elapsed || 0) > 0)
          throw Error("Log the current session before changing missions.");
        s.selected = b.dataset.missionGo;
        tab = "mentor";
        api.save();
        api.render();
        return;
      }
      if (b.dataset.missionResources) {
        const t = api
          .project()
          .tasks.find((t) => t.id === b.dataset.missionResources);
        s.resourceTask = t.id;
        api.modal(
          api.header("Find evidence for this mission") +
            `<p class="subtext">Search the topic, not the task instruction. Use specific concepts such as “universal design university accessibility”. Your query is sent to Crossref.</p><label class="field">Research keywords<input id="research-query" value="${esc(t.query || "")}" placeholder="e.g. stakeholder participation campus design" maxlength="200"></label><p class="hint">Mission: ${esc(t.title)}</p>${button("search-resources", "Search research ↗", "primary")}`,
        );
        return;
      }
      if (b.dataset.studio === "search-resources") {
        const query = document.querySelector("#research-query").value;
        api.close();
        await resources(s.resourceTask, query);
        return;
      }
      if (b.dataset.missionDelete !== undefined) {
        if (timer || (s.elapsed || 0) > 0)
          throw Error("Log your focus session before deleting missions.");
        const list = s.pending || api.project().tasks;
        if (list.length <= 1)
          throw Error("Keep at least one mission in the plan.");
        list.splice(Number(b.dataset.missionDelete), 1);
        api.save();
        api.render();
        return;
      }
      if (b.dataset.missionUp !== undefined) {
        const list = s.pending || api.project().tasks,
          i = Number(b.dataset.missionUp);
        if (i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
        api.save();
        api.render();
        return;
      }
      if (b.dataset.slideDelete !== undefined) {
        s.slides.splice(Number(b.dataset.slideDelete), 1);
        api.save();
        api.render();
        return;
      }
      const action = b.dataset.studio;
      if (!action) return;
      if (["planner", "mentor", "report", "slides"].includes(action)) {
        await generate(action);
        return;
      }
      if (action === "settings") {
        api.modal(
          api.header("Your AI. Your choice.") +
            `<div class="engine-options"><div class="engine-card"><span class="eyebrow">FREE / ON THIS DEVICE</span><h3>Download a small, private AI.</h3><p>Qwen 2.5 0.5B · about 400 MB, cached in this browser. No account, API key or paid backend. Runs on CPU using WebAssembly. Keep this tab open; older phones may be slow or run out of memory.</p><p class="hint">Local context: first 2,200 brief characters, 1,200 rubric characters and 1,800 note characters, plus your latest question. Use a focused excerpt for best results. Local drafts are shorter than cloud drafts. Local task budgets start at 30 minutes and need your adjustment.</p><p id="local-ai-status" role="status">${esc(localStatus.text)}</p>${button("load-local", localStatus.ready ? "Use local AI" : "Download & start local AI", "primary")}</div><details><summary>Optional cloud AI</summary><p>A configured server can handle longer context and a stronger model. Only this option sends assignment context to the configured provider.</p><label class="field">Workspace access code<input type="password" id="workspace-code" autocomplete="off"></label>${button("save-settings", "Use cloud AI")}</details></div>`,
        );
        return;
      }
      if (action === "load-local") {
        aiMode = "local";
        b.disabled = true;
        try {
          await loadLocalAI((text) => {
            const el = document.querySelector("#local-ai-status");
            if (el) el.textContent = text;
          });
          api.toast(
            "Local AI is ready. Generate from your brief or ask the mentor.",
          );
          b.textContent = "Local AI ready ✓";
        } finally {
          b.disabled = false;
        }
        return;
      }
      if (action === "stop-ai") {
        stopLocalAI();
        return;
      }
      if (action === "save-settings") {
        aiMode = "cloud";
        access = document.querySelector("#workspace-code").value;
        api.close();
        api.toast("Access code set for this session.");
        return;
      }
      if (action === "apply") {
        if (timer || (s.elapsed || 0) > 0)
          throw Error("Log your focus session before replacing missions.");
        api.apply(s.pending);
        delete s.pending;
        api.save();
        message =
          "Missions saved. Set realistic availability to see what fits.";
        api.render();
        return;
      }
      if (action === "discard") {
        delete s.pending;
        api.save();
        api.render();
        return;
      }
      if (action === "add") {
        const list = s.pending || api.project().tasks;
        if (list.length >= 30)
          throw Error("Keep this plan to 30 missions or fewer.");
        list.push({
          id: crypto.randomUUID(),
          title: "New mission",
          estimate: 20,
          note: "Define the action and how you will check it.",
          completed: 0,
          optional: false,
        });
        api.save();
        api.render();
        return;
      }
      if (action === "add-slide") {
        s.slides ||= [];
        if (s.slides.length >= 20)
          throw Error("Keep the presentation to 20 slides or fewer.");
        s.slides.push({
          title: "Your next idea",
          body: "The point you want to make.\nThe evidence that supports it.",
          notes: "",
        });
        api.save();
        api.render();
        return;
      }
      if (action === "start") {
        if (timer) return;
        s.selected ||= api
          .project()
          .tasks.find((t) => t.completed < t.estimate)?.id;
        if (!s.selected) throw Error("Add a mission first.");
        s.sessionTask = s.selected;
        timer = {
          started: Date.now(),
          data: s,
          project: api.project().projectId,
          task: s.selected,
        };
        tick = setInterval(() => {
          if (timer.project !== api.project().projectId) {
            clearInterval(tick);
            timer = null;
            return;
          }
          timer.data.elapsed =
            (timer.data.elapsed || 0) + Date.now() - timer.started;
          timer.started = Date.now();
          api.save();
          const el = document.querySelector("#studio-clock");
          if (el) el.textContent = clockText();
        }, 1000);
        api.render();
        return;
      }
      if (action === "pause") {
        stopTimer();
        api.render();
        return;
      }
      if (action === "log") {
        stopTimer();
        const min = Math.floor((s.elapsed || 0) / 60000);
        if (min < 1)
          throw Error("Complete at least one focused minute before logging.");
        const credited = api.log(s.sessionTask || s.selected, min);
        s.elapsed = 0;
        api.save();
        message =
          min +
          " focused minutes recorded; " +
          credited +
          " minutes credited to remaining work.";
        api.render();
        return;
      }
      if (action === "val") {
        await navigator.clipboard.writeText(
          "Assignment: " +
            api.project().title +
            "\nBrief: " +
            s.brief +
            "\nRubric: " +
            s.rubric +
            "\nMy notes: " +
            s.notes +
            "\nHelp me understand the next step without replacing my own thinking.",
        );
        api.toast(
          "Context copied. Paste it into Val after signing in to RMIT.",
        );
        return;
      }
      if (
        ["docx", "tex", "markdown", "report-pdf"].includes(action) &&
        !s.report.trim()
      )
        throw Error("Write or generate a report first.");
      if (["pptx", "slides-pdf"].includes(action) && !s.slides?.length)
        throw Error("Add or generate slides first.");
      if (action === "report-pdf" || action === "slides-pdf") {
        printDocument(action === "slides-pdf");
        return;
      }
      if (action === "markdown") {
        download("restrive-report.txt", s.report, "text/plain");
        return;
      }
      if (["docx", "tex", "pptx"].includes(action)) {
        const exports = await import("../vendor/export-core.js");
        if (action === "docx")
          download(
            "restrive-report.docx",
            await exports.reportBlob(api.project().title, s.report),
          );
        if (action === "tex")
          download(
            "restrive-report.tex",
            exports.latexDocument(api.project().title, s.report),
            "application/x-tex",
          );
        if (action === "pptx")
          await exports
            .presentation(api.project().title, s.slides)
            .writeFile({ fileName: "restrive-presentation.pptx" });
        api.toast("Export ready.");
      }
    } catch (error) {
      message = error.message;
      api.toast(error.message);
      api.render();
    }
  });
}
