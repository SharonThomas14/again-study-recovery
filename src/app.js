import {
  initCampus,
  campusScreen,
  campusExport,
  campusRestore,
  clearCampus,
} from "./campus.js";
import {
  iso,
  addDays,
  daysBetween,
  dateLabel,
  minutes,
  plan,
  parseInterruption,
  makeDemo,
  validateProject,
} from "./planner.js";
const $ = (s) => document.querySelector(s),
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
const KEY = "again.project.v1";
let state = makeDemo(),
  storageError = false;
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (validateProject(saved)) state = saved;
  else if (saved) storageError = true;
} catch {
  storageError = true;
}
let projects = [];
try {
  projects = JSON.parse(localStorage.getItem("again.projects.v1")) || [];
  if (!Array.isArray(projects)) projects = [];
  projects = projects.filter(validateProject);
} catch {}
state.projectId ||= crypto.randomUUID();
let view = "today",
  todayMinutes = Math.min(20, state.availability[iso()] ?? 20),
  interruption = state.history?.length
    ? `Today I have ${Math.min(20, state.availability[iso()] ?? 20)} minutes.`
    : "I missed yesterday’s session, and today I only have 20 minutes.",
  draft = null,
  undo = null,
  focus = null,
  ticker = null,
  toastTimeout;
const current = () =>
  plan(state.tasks, state.availability, iso(), state.deadline, state.omitted);
if (!state.schedule?.days) state.schedule = current();
const remaining = () =>
  state.tasks.reduce((n, t) => n + Math.max(0, t.estimate - t.completed), 0);
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    projects = projects.filter((p) => p.projectId !== state.projectId);
    projects.push(structuredClone(state));
    localStorage.setItem("again.projects.v1", JSON.stringify(projects));
    storageError = false;
  } catch {
    storageError = true;
    toast("Your browser could not save. Export a backup to keep this plan.");
  }
}
function toast(m) {
  $("#toast").textContent = m;
  $("#toast").classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $("#toast").classList.remove("show"), 4500);
}
function modal(s) {
  $("#modal-content").innerHTML = `<div class="modal-inner">${s}</div>`;
  if (!$("#modal").open) $("#modal").showModal();
}
const header = (t) =>
  `<div class="modal-header"><h2>${t}</h2><button class="close" data-action="close" aria-label="Close dialog">×</button></div>`;
function close() {
  clearInterval(ticker);
  ticker = null;
  focus = null;
  $("#modal").close();
}
function timeline(p) {
  const all = p.days.filter((d) => d.date >= iso()),
    days = all.slice(0, 7);
  if (!days.length)
    return '<div class="notice warning">The deadline has passed. Record a new deadline only if you have an agreed extension.</div>';
  return `<div class="timeline">${days.map((d) => `<div class="day ${d.date === iso() ? "today" : ""}"><div class="day-label"><span>${d.date === iso() ? "Today" : dateLabel(d.date, { weekday: "short" })}</span><b>${dateLabel(d.date, { day: "numeric" })}</b></div>${d.sessions.length ? d.sessions.map((s) => `<div class="day-session">${esc(s.title)}<span>${minutes(s.minutes)}</span></div>`).join("") : `<div class="day-session empty">${d.capacity ? "Room to breathe" : "Life outside study"}</div>`}<div class="hint">${d.used} / ${d.capacity} min</div></div>`).join("")}</div>${all.length > 7 ? `<p class="hint">Next 7 days shown. Calendar export includes all ${all.length} days.</p>` : ""}`;
}
function render() {
  $("#today-date").textContent = dateLabel(iso(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).toUpperCase();
  $("#top-label").textContent = {
    today: "A fresh start",
    plan: "Your assignment, in view",
    library: "Your course library",
    readiness: "Learning, in view",
  }[view];
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "library" || view === "readiness") {
    $("#main").innerHTML = campusScreen(view);
    return;
  }
  const p = current(),
    done = remaining() === 0,
    next = p.days.flatMap((d) =>
      d.sessions.map((s) => ({ ...s, date: d.date })),
    )[0];
  $("#main").innerHTML =
    `${storageError ? '<div class="storage-error">Saved data could not be read or device storage is unavailable. Export a backup before leaving.</div>' : ""}${
      view === "today"
        ? `
 <section class="hero"><div><div class="eyebrow"><span class="status-dot"></span> ${state.demo ? "A LITTLE PRACTICE. A REAL FRESH START." : "YOUR PLAN, AT YOUR PACE."}</div><h1>${done ? "Look how far<br><em>you’ve come.</em>" : "A little off track.<br><em>Still moving forward.</em>"}</h1><p>${done ? "Your assignment steps are complete. Take a moment to enjoy it." : "You don’t need to catch up with yesterday. Just find your next step."}</p></div><svg class="route-art" viewBox="0 0 180 150" aria-hidden="true"><path d="M10 130C55 138 25 65 61 57C100 48 106 120 73 113C30 104 95 9 146 38" fill="none" stroke="#e75c3d" stroke-width="2.5" stroke-linecap="round"/><path d="M130 23l20 16-25 5" fill="none" stroke="#e75c3d" stroke-width="2.5"/><circle cx="10" cy="130" r="4" fill="#e75c3d"/><text x="70" y="145" font-size="10" fill="#717568">a different way forward</text></svg></section>
 ${p.overflow ? `<div class="notice warning" role="status">${minutes(p.overflow)} of work still does not fit before your deadline. <button class="text-button" data-action="recover">Review the trade-off ↗</button></div>` : ""}
 <div class="section-title"><h2>Let’s work with today.</h2><span class="tag">${state.demo ? "EXAMPLE ASSIGNMENT" : "YOUR ASSIGNMENT"}</span></div><section class="desk-grid"><div class="recovery-card"><div class="card-head"><span class="eyebrow">01 / RESET THE PLAN</span><span>↺</span></div><h2>What changed?</h2><p class="subtext">Less time? Missed a session? There’s room to adjust.</p><label class="sr-only" for="interruption">What changed?</label><textarea id="interruption" maxlength="500">${esc(interruption)}</textarea><div class="time-row"><span class="subtext">Time I have today</span><div class="time-pills">${[0, 20, 45, 60].map((n) => `<button data-minutes="${n}" class="${n === todayMinutes ? "selected" : ""}" aria-pressed="${n === todayMinutes}">${n}m</button>`).join("")}</div></div><button class="primary" data-action="recover">Find my way forward <span>↗</span></button><p class="hint">See what changes before you commit. <button class="text-button" data-action="custom-time">Other time</button></p></div>
 <article class="next-card"><div class="card-head"><span class="eyebrow">02 / YOUR NEXT SMALL STEP</span><span class="tag">${next ? minutes(next.minutes) : "ALL CLEAR"}</span></div><div class="circle-detail"></div><h2>${done ? "You did the thing." : next ? esc(next.title) : "Make room for what matters."}</h2><p>${done ? "Every small session added up. Your work is ready for its next chapter." : next ? esc(state.tasks.find((t) => t.id === next.taskId)?.note) : "There is no study time before your deadline. Adjust your availability or decide what can wait."}</p><div class="next-bottom"><span>${next ? `${next.date === iso() ? "TODAY" : dateLabel(next.date).toUpperCase()} · ONE THING AT A TIME` : "YOUR PACE. YOUR PLAN."}</span><button class="round-arrow" data-action="${next ? "focus" : "edit"}" aria-label="${next ? "Start focus session" : "Edit assignment"}">↗</button></div></article></section>
 <div class="assignment-strip"><div class="assignment-meta"><span class="assignment-icon">▤</span><div><strong>${esc(state.title)}</strong><p>${esc(state.course)} · ${esc(state.goal)}</p></div></div><div class="deadline">Due ${dateLabel(state.deadline)}<small>${minutes(p.required)} planned work remaining${p.skipped.length ? " · optional work deferred" : ""}</small></div></div><section><div class="section-title"><h2>The road ahead <span style="color:var(--muted);font-size:11px">/ next 7 days</span></h2><button class="text-button" data-view="plan">See the whole plan ↗</button></div>${timeline(state.schedule)}<div class="timeline-caption"><span>${state.history.length ? "Your accepted plan. Adjust it whenever life changes." : "Your original plan. Unfinished past sessions are included in recovery."}</span><span class="legend"><span><i></i>Study session</span><span>Open space is intentional</span></span></div></section><button class="new-assignment" data-action="new">${state.demo ? "Make it yours — start your own assignment ↗" : "Start a different assignment ↗"}</button>
 `
        : `<div class="eyebrow">THE WHOLE PLAN / ${state.demo ? "EXAMPLE" : "PERSONAL"}</div><h1 class="large-heading">${esc(state.title)}</h1><p class="subtext">${esc(state.goal)} · Due ${dateLabel(state.deadline)}</p><div class="plan-toolbar"><div><button class="secondary" data-action="projects">Switch project</button><button class="secondary" data-action="edit">Edit assignment ↗</button><button class="secondary" data-action="availability">Set availability</button></div><div><button class="secondary" data-action="calendar">Export calendar ↓</button><button class="secondary" data-action="backup">Backup ↓</button></div></div><div class="metrics"><div class="metric"><b>${minutes(p.required)}</b><span>Remaining selected work</span></div><div class="metric"><b>${minutes(p.capacity)}</b><span>Available before deadline</span></div><div class="metric"><b>${minutes(p.overflow || p.slack)}</b><span>${p.overflow ? "Does not fit" : "Spare study time"}</span></div></div>${p.overflow ? `<div class="notice warning">There is ${minutes(p.overflow)} more work than time. <button class="text-button" data-action="recover">Review priorities ↗</button></div>` : ""}${timeline(p)}<div class="task-list">${state.tasks.map((t, i) => `<div class="task-row ${t.completed >= t.estimate ? "done" : ""}"><button class="check" data-complete="${esc(t.id)}" aria-label="${t.completed >= t.estimate ? "Reopen" : "Mark complete"} ${esc(t.title)}">${t.completed >= t.estimate ? "✓" : String(i + 1).padStart(2, "0")}</button><div><h3>${esc(t.title)} ${t.optional ? '<span class="tag">OPTIONAL</span>' : ""} ${state.omitted.includes(t.id) ? '<span class="tag">DEFERRED</span>' : ""}</h3><p>${esc(t.note)}</p></div><span>${t.completed}/${t.estimate}m</span></div>`).join("")}</div><div class="button-row"><button class="secondary" data-action="new">New assignment</button><button class="secondary" data-action="import">Restore backup</button>${undo ? '<button class="secondary" data-action="undo">Undo last change</button>' : ""}</div>`
    }`;
}
function recovery() {
  const parsed = parseInterruption(interruption);
  if (parsed.minutes !== null) todayMinutes = parsed.minutes;
  draft = {
    availability: { ...state.availability, [iso()]: todayMinutes },
    omitted: [...state.omitted],
  };
  showRecovery();
}
function showRecovery() {
  const p = plan(
      state.tasks,
      draft.availability,
      iso(),
      state.deadline,
      draft.omitted,
    ),
    before = state.schedule || current(),
    loss = Math.max(0, (before.bufferDays || 0) - p.bufferDays);
  const changes = state.tasks
    .map((t) => ({
      t,
      was: before.days
        .filter((d) => d.sessions.some((s) => s.taskId === t.id))
        .map((d) => d.date),
      now: p.days
        .filter((d) => d.sessions.some((s) => s.taskId === t.id))
        .map((d) => d.date),
    }))
    .filter((c) => c.was.join() !== c.now.join());
  modal(
    `${header(p.feasible ? "A way forward. With room for life." : "Let’s be honest about the time.")}<p class="subtext">Today is set to <strong>${todayMinutes} minutes</strong>. All unfinished work, including missed sessions, is carried forward. Completed progress is preserved.</p><div class="metrics"><div class="metric"><b>${minutes(p.required)}</b><span>Work to do</span></div><div class="metric"><b>${minutes(p.capacity)}</b><span>Time you actually have</span></div><div class="metric"><b>${minutes(p.overflow || p.slack)}</b><span>${p.overflow ? "Does not fit" : "Spare study time"}</span></div></div><div class="notice ${p.feasible ? "" : "warning"}">${p.feasible ? `Your selected work fits. ${loss ? `Your calendar-day buffer reduces by ${loss} ${loss === 1 ? "day" : "days"}. ` : ""}Estimated finish: ${dateLabel(p.finish)}. ${p.slack ? "Spare minutes allow for uncertainty; they are not a promise." : "No spare study time remains. A longer task could put the deadline at risk."}` : `${minutes(p.overflow)} cannot fit before ${dateLabel(state.deadline)}. Defer optional work, add realistic availability, or discuss an extension. Required work is never silently removed.`}</div><div class="eyebrow">WHAT CHANGES</div>${changes.length ? changes.map(({ t, was, now }) => `<div class="change"><span>↳</span><div><strong>${esc(t.title)}</strong><p>${draft.omitted.includes(t.id) ? "Deferred by your choice." : now.length ? `${was.length ? dateLabel(was[0]) : "Unscheduled"} → ${dateLabel(now[0])}${now.length > 1 ? " (split across sessions)" : ""}` : "No space before the deadline."}</p></div><small>${minutes(t.estimate - t.completed)}</small></div>`).join("") : '<p class="subtext">No task dates change. Your available time is updated.</p>'}${p.unscheduled.length ? `<p class="error">Still unscheduled: ${p.unscheduled.map((s) => `${esc(s.title)} (${minutes(s.minutes)})`).join("; ")}.</p>` : ""}${state.tasks.some((t) => t.optional && t.completed < t.estimate) ? '<h3 style="font-size:14px;margin-top:24px">You choose what can wait.</h3><p class="subtext">Only defer work you have confirmed is optional for your assignment.</p>' : ""}${state.tasks
      .filter((t) => t.optional && t.completed < t.estimate)
      .map(
        (t) =>
          `<label class="choice"><input type="checkbox" data-omit="${esc(t.id)}" ${draft.omitted.includes(t.id) ? "checked" : ""}><span>Defer “${esc(t.title)}”<small>Frees ${minutes(t.estimate - t.completed)}. It stays listed as deferred.</small></span></label>`,
      )
      .join(
        "",
      )}<div class="button-row"><button class="secondary" data-action="availability">Change availability</button><button class="primary" data-action="accept">${p.feasible ? "Use this recovery plan" : "Save partial plan with gaps"} <span>↗</span></button></div><p class="hint">${p.feasible ? "You can undo this change." : "Saving does not resolve the shortfall. Unscheduled work stays visible."} Estimates are yours to adjust.</p>`,
  );
}
function accept() {
  undo = structuredClone(state);
  state.availability = draft.availability;
  state.omitted = draft.omitted;
  state.schedule = current();
  state.history.push({
    date: new Date().toISOString(),
    minutes: todayMinutes,
    overflow: state.schedule.overflow,
  });
  state.history = state.history.slice(-20);
  draft = null;
  save();
  close();
  render();
  toast("Recovery plan saved. One small step from here.");
}
function taskEditor(t) {
  return `<div class="task-edit" data-task-id="${esc(t.id)}"><input type="text" value="${esc(t.title)}" required maxlength="120" aria-label="Step name"><input type="number" value="${t.estimate}" min="${Math.max(5, t.completed || 0)}" max="3000" step="1" required aria-label="Estimated minutes"><label><input type="checkbox" ${t.optional ? "checked" : ""}>Optional</label><button type="button" data-remove-task aria-label="Remove step">×</button></div>`;
}
function edit(isNew = false) {
  const p = isNew
    ? {
        title: "",
        course: "",
        goal: "A complete, clear submission",
        deadline: addDays(iso(), 7),
        tasks: [
          { id: "brief", title: "Understand the brief", estimate: 20 },
          { id: "research", title: "Gather evidence", estimate: 60 },
          { id: "draft", title: "Create the first draft", estimate: 90 },
          { id: "review", title: "Review and submit", estimate: 30 },
        ],
      }
    : state;
  modal(
    `${header(isNew ? "Make room for your assignment." : "Your assignment. Your priorities.")}<form id="edit-form" data-new="${isNew}"><label class="field">Assignment name<input name="title" value="${esc(p.title)}" placeholder="e.g. Community design proposal" required maxlength="120"></label><div class="form-row"><label class="field">Course / subject<input name="course" value="${esc(p.course)}" placeholder="Optional" maxlength="100"></label><label class="field">Deadline<input name="deadline" type="date" value="${p.deadline}" min="${iso()}" max="${addDays(iso(), 90)}" required></label></div><label class="field">What are you aiming for?<input name="goal" value="${esc(p.goal)}" maxlength="180" required></label><h3 style="font-size:14px;margin-top:25px">Break it into steps.</h3><p class="subtext">Keep prerequisite steps first. Estimates include work already done. Mark optional only when you can safely defer that step.</p><div class="task-edit task-labels"><span>STEP · IN WORKING ORDER</span><span>MINUTES</span><span>OPTIONAL</span></div><div id="edit-tasks">${p.tasks.map(taskEditor).join("")}</div><button type="button" class="text-button" data-action="add-task">+ Add a step</button><p id="form-error" class="error" role="alert"></p><div class="button-row"><button type="button" class="secondary" data-action="close">Cancel</button><button class="primary" type="submit">${isNew ? "Set my availability" : "Save assignment"} <span>↗</span></button></div>${isNew ? '<p class="hint">Your current assignment stays in your project library.</p>' : ""}</form>`,
  );
}
function availability() {
  const p = draft || state,
    count = Math.min(91, Math.max(0, daysBetween(iso(), state.deadline) + 1));
  modal(
    `${header("Time you actually have.")}<p class="subtext">Realistic study minutes, after work, meals, travel and rest. Zero is valid. These are daily budgets; calendar export creates all-day reminders.</p><form id="availability-form"><div class="week-inputs">${Array.from(
      { length: count },
      (_, i) => {
        const day = addDays(iso(), i);
        return `<label>${dateLabel(day, { weekday: "short", day: "numeric", month: "short" })}<input type="number" name="${day}" min="0" max="480" step="1" value="${p.availability[day] ?? 0}" required aria-label="Study minutes ${dateLabel(day)}"></label>`;
      },
    ).join(
      "",
    )}</div>${!count ? '<p class="error">The deadline has passed. Edit the assignment to record an agreed new deadline.</p>' : ""}<div class="button-row"><button type="button" class="secondary" data-action="close">Cancel</button><button class="primary" type="submit" ${count ? "" : "disabled"}>Review this availability <span>↗</span></button></div></form>`,
  );
}
function startFocus() {
  const next = current().days.flatMap((d) =>
    d.sessions.map((s) => ({ ...s, date: d.date })),
  )[0];
  if (!next) {
    toast("Add availability to make room for a session.");
    availability();
    return;
  }
  if (next.date !== iso()) {
    toast(
      "No time is budgeted today. Update availability before starting a session.",
    );
    availability();
    return;
  }
  const t = state.tasks.find((t) => t.id === next.taskId),
    length = next.minutes;
  focus = {
    taskId: t.id,
    length,
    seconds: length * 60,
    running: false,
    end: 0,
  };
  modal(
    `${header("Just this one thing.")}<span class="tag">${esc(state.course || "YOUR ASSIGNMENT")}</span><h3 class="large-heading" style="font-size:30px;margin-bottom:12px">${esc(t.title)}</h3><p class="subtext">${esc(t.note)}</p><div class="focus-clock" id="clock">${String(length).padStart(2, "0")}:00</div><p class="focus-note">The timer is a guide. You decide when the work is done.</p><div class="button-row"><button class="secondary" data-action="toggle-timer" id="timer-button">Start timer</button><button class="primary" data-action="finish-session">Log ${length} minutes completed <span>✓</span></button></div><p class="hint">Reduces the remaining estimate by ${length} minutes. Closing does not complete the work.</p>`,
  );
}
function toggleTimer() {
  if (!focus) return;
  focus.running = !focus.running;
  if (focus.running) {
    focus.end = Date.now() + focus.seconds * 1000;
    $("#timer-button").textContent = "Pause timer";
    ticker = setInterval(() => {
      if (!focus) return;
      focus.seconds = Math.max(0, Math.ceil((focus.end - Date.now()) / 1000));
      $("#clock").textContent =
        `${String(Math.floor(focus.seconds / 60)).padStart(2, "0")}:${String(focus.seconds % 60).padStart(2, "0")}`;
      if (!focus.seconds) {
        focus.running = false;
        clearInterval(ticker);
        $("#timer-button").textContent = "Session time reached";
        $("#timer-button").disabled = true;
        toast("Time is up. Log your progress when ready.");
      }
    }, 250);
  } else {
    clearInterval(ticker);
    $("#timer-button").textContent = "Resume timer";
  }
}
function finishSession() {
  if (!focus) return;
  undo = structuredClone(state);
  const t = state.tasks.find((t) => t.id === focus.taskId),
    amount = Math.min(focus.length, t.estimate - t.completed);
  t.completed += amount;
  state.availability[iso()] = Math.max(
    0,
    (state.availability[iso()] || 0) - amount,
  );
  todayMinutes = state.availability[iso()];
  interruption = `Today I have ${todayMinutes} minutes left.`;
  state.schedule = current();
  save();
  close();
  render();
  toast(`${minutes(amount)} logged. Your next step is ready.`);
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCalendar() {
  const p = current();
  if (!p.days.some((d) => d.sessions.length)) {
    toast("No scheduled sessions to export.");
    return;
  }
  const clean = (s) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Again//Study Recovery//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const d of p.days)
    d.sessions.forEach((s, i) =>
      rows.push(
        "BEGIN:VEVENT",
        `UID:${d.date}-${s.taskId}-${i}@again.local`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "")}`,
        `DTSTART;VALUE=DATE:${d.date.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${addDays(d.date, 1).replaceAll("-", "")}`,
        `SUMMARY:${clean(s.title)} (${s.minutes} min)`,
        `DESCRIPTION:${clean(state.title)} — daily study reminder. Choose a time that works for you.`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ),
    );
  rows.push("END:VCALENDAR");
  download("again-study-plan.ics", rows.join("\r\n"), "text/calendar");
  toast("Exported as all-day study reminders.");
}
function about() {
  modal(
    `${header("Room to begin again.")}<p class="subtext">Again is an assignment recovery experiment for students whose lives don’t follow a perfect calendar. It makes remaining work, actual availability and the consequences of replanning visible.</p><div class="notice">This prototype uses a rule-based scheduler. It doesn’t predict grades, read your rubric, or use a language model. You control estimates, step order and optional work.</div><p class="subtext">The hypothesis: students find it easier to resume when they understand and choose the trade-off. This still needs testing with real students.</p><div class="button-row"><button class="secondary" data-action="demo">Load example assignment</button><button class="primary" data-action="new">Try your own assignment <span>↗</span></button></div>`,
  );
}
function privacy() {
  modal(
    `${header("Your plan stays here.")}<p class="subtext">Your assignments, course text and practice history are saved in this browser’s local storage. They are not sent to an AI service or synced to another device. Clearing browser data removes this copy. Download a backup to keep it.</p><p class="subtext">Fonts load from Google Fonts. Hosting receives normal web requests. There is no app analytics, account system or payment collection. Reminder notifications work while the page is open; calendar exports can remind you after it closes.</p><div class="button-row"><button class="secondary" data-action="backup">Download backup</button><button class="secondary" data-action="import">Restore backup</button><button class="secondary" data-action="clear-data">Clear saved plan</button></div>`,
  );
}
document.addEventListener("input", (e) => {
  if (e.target.id === "interruption") {
    interruption = e.target.value;
    const p = parseInterruption(interruption);
    if (p.minutes !== null) {
      todayMinutes = p.minutes;
      document.querySelectorAll("[data-minutes]").forEach((b) => {
        b.classList.toggle(
          "selected",
          Number(b.dataset.minutes) === todayMinutes,
        );
        b.setAttribute(
          "aria-pressed",
          Number(b.dataset.minutes) === todayMinutes,
        );
      });
    }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.omit) {
    draft.omitted = e.target.checked
      ? [...new Set([...draft.omitted, e.target.dataset.omit])]
      : draft.omitted.filter((id) => id !== e.target.dataset.omit);
    showRecovery();
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.projectId) {
    save();
    const selected = projects.find((p) => p.projectId === b.dataset.projectId);
    if (selected) {
      state = structuredClone(selected);
      save();
      close();
      view = "plan";
      render();
    }
    return;
  }
  if (b.dataset.view) {
    view = b.dataset.view;
    render();
    return;
  }
  if (b.dataset.minutes !== undefined) {
    todayMinutes = Number(b.dataset.minutes);
    interruption = `${/missed/i.test(interruption) ? "I missed yesterday’s session. " : ""}Today I have ${todayMinutes} minutes.`;
    render();
    return;
  }
  if (b.dataset.complete) {
    undo = structuredClone(state);
    const t = state.tasks.find((t) => t.id === b.dataset.complete);
    t.completed = t.completed >= t.estimate ? 0 : t.estimate;
    state.schedule = current();
    save();
    render();
    toast("Progress updated. You can undo this change.");
    return;
  }
  if (b.hasAttribute("data-remove-task")) {
    b.closest(".task-edit").remove();
    return;
  }
  switch (b.dataset.action) {
    case "close":
      close();
      draft = null;
      break;
    case "recover":
      recovery();
      break;
    case "accept":
      accept();
      break;
    case "edit":
      draft = null;
      edit();
      break;
    case "new":
      draft = null;
      edit(true);
      break;
    case "projects":
      modal(
        `${header("Your projects. Still here.")}<div class="task-list">${projects.length ? projects.map((p) => `<button class="project-switch" data-project-id="${esc(p.projectId)}"><strong>${esc(p.title)}</strong><span>${esc(p.course)} · ${dateLabel(p.deadline)} ↗</span></button>`).join("") : '<p class="subtext">Save your first assignment to keep it here.</p>'}</div><button class="primary" data-action="new">Create a project <span>↗</span></button>`,
      );
      break;
    case "availability":
      availability();
      break;
    case "add-task":
      $("#edit-tasks").insertAdjacentHTML(
        "beforeend",
        taskEditor({ id: crypto.randomUUID(), title: "", estimate: 30 }),
      );
      break;
    case "focus":
      startFocus();
      break;
    case "toggle-timer":
      toggleTimer();
      break;
    case "finish-session":
      finishSession();
      break;
    case "calendar":
      exportCalendar();
      break;
    case "backup":
      download(
        "again-backup.json",
        JSON.stringify(
          {
            format: "again.workspace.v1",
            active: state,
            projects,
            learning: campusExport(),
          },
          null,
          2,
        ),
        "application/json",
      );
      toast("Backup downloaded.");
      break;
    case "undo":
      if (undo) {
        state = undo;
        undo = null;
        save();
        render();
        toast("Last change undone.");
      }
      break;
    case "about":
      about();
      break;
    case "privacy":
      privacy();
      break;
    case "custom-time":
      modal(
        `${header("What fits today?")}<form id="time-form"><label class="field">Available study minutes<input name="minutes" type="number" min="0" max="480" step="1" value="${todayMinutes}" required></label><button class="primary" type="submit">Use this time <span>↗</span></button></form>`,
      );
      break;
    case "demo":
      modal(
        `${header("Return to the example?")}<p class="subtext">Replaces the active assignment. Download a backup first to keep it.</p><div class="button-row"><button class="secondary" data-action="backup">Download backup</button><button class="primary" data-action="confirm-demo">Load example <span>↗</span></button></div>`,
      );
      break;
    case "confirm-demo":
      undo = structuredClone(state);
      state = makeDemo();
      save();
      close();
      view = "today";
      render();
      toast("Example loaded.");
      break;
    case "clear-data":
      modal(
        `${header("Clear this device’s copy?")}<p class="subtext">Export a backup first if you want to keep your assignment.</p><div class="button-row"><button class="secondary" data-action="backup">Download backup</button><button class="primary" data-action="confirm-clear">Clear saved plan <span>×</span></button></div>`,
      );
      break;
    case "confirm-clear":
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem("again.projects.v1");
        clearCampus();
        projects = [];
      } catch {}
      state = makeDemo();
      undo = null;
      close();
      render();
      toast("Saved plan cleared. Showing an unsaved example.");
      break;
    case "import":
      modal(
        `${header("Restore an assignment.")}<p class="subtext">An Again JSON backup replaces this device’s current plan.</p><form id="import-form"><label class="field">Backup file<input type="file" name="backup" accept="application/json,.json" required></label><p id="import-error" class="error" role="alert"></p><button class="primary" type="submit">Restore backup <span>↗</span></button></form>`,
      );
      break;
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target,
    data = new FormData(form);
  if (form.id === "time-form") {
    todayMinutes = Number(data.get("minutes"));
    interruption = `Today I have ${todayMinutes} minutes.`;
    close();
    render();
  }
  if (form.id === "edit-form") {
    const isNew = form.dataset.new === "true",
      rows = [...form.querySelectorAll("[data-task-id]")];
    if (!rows.length || rows.length > 50) {
      $("#form-error").textContent = "Use between 1 and 50 steps.";
      return;
    }
    const tasks = rows.map((row) => {
      const old = isNew
        ? null
        : state.tasks.find((t) => t.id === row.dataset.taskId);
      return {
        id: row.dataset.taskId,
        title: row.querySelector("input[type=text]").value.trim(),
        estimate: Number(row.querySelector("input[type=number]").value),
        optional: row.querySelector("input[type=checkbox]").checked,
        completed: old?.completed || 0,
        note: old?.note || "Work on this step, then log the progress you make.",
      };
    });
    if (
      tasks.some((t) => !t.title) ||
      !String(data.get("title")).trim() ||
      !String(data.get("goal")).trim()
    ) {
      $("#form-error").textContent =
        "Give the assignment, goal and every step a name.";
      return;
    }
    undo = structuredClone(state);
    if (isNew) save();
    const deadline = String(data.get("deadline")),
      av = isNew ? {} : { ...state.availability };
    if (isNew)
      for (let d = iso(); d <= deadline; d = addDays(d, 1))
        av[d] = new Date(d + "T12:00:00").getDay() === 0 ? 0 : 45;
    state = {
      ...state,
      projectId: isNew ? crypto.randomUUID() : state.projectId,
      demo: false,
      title: String(data.get("title")).trim(),
      course: String(data.get("course")).trim(),
      goal: String(data.get("goal")).trim(),
      deadline,
      tasks,
      availability: av,
      omitted: isNew
        ? []
        : state.omitted.filter((id) =>
            tasks.some((t) => t.id === id && t.optional),
          ),
      history: isNew ? [] : state.history,
    };
    state.schedule = current();
    save();
    close();
    render();
    if (isNew) availability();
    else toast("Assignment updated.");
  }
  if (form.id === "availability-form") {
    const values = Object.fromEntries(
      [...data.entries()].map(([d, n]) => [d, Number(n)]),
    );
    draft = {
      availability: { ...state.availability, ...values },
      omitted: [...(draft?.omitted || state.omitted)],
    };
    todayMinutes = draft.availability[iso()] || 0;
    showRecovery();
  }
  if (form.id === "import-form") {
    try {
      const file = data.get("backup");
      if (file.size > 5000000)
        throw Error("Choose a backup smaller than 5 MB.");
      const raw = JSON.parse(await file.text());
      const loaded = raw.format === "again.workspace.v1" ? raw.active : raw;
      if (!validateProject(loaded))
        throw Error("This is not a valid Again backup.");
      if (raw.format === "again.workspace.v1") {
        if (
          !Array.isArray(raw.projects) ||
          !raw.projects.every(validateProject)
        )
          throw Error("Invalid project library.");
        campusRestore(raw.learning);
        projects = raw.projects;
      }
      undo = structuredClone(state);
      state = {
        ...loaded,
        history: Array.isArray(loaded.history) ? loaded.history.slice(-20) : [],
      };
      state.schedule = current();
      save();
      close();
      render();
      toast("Backup restored.");
    } catch (err) {
      $("#import-error").textContent = err.message;
    }
  }
});
$("#modal").addEventListener("cancel", () => {
  clearInterval(ticker);
  ticker = null;
  focus = null;
  draft = null;
});
initCampus({
  modal,
  header,
  close,
  toast,
  download,
  render,
  navigate: (v) => {
    view = v;
    render();
  },
  addTasks: (tasks, courseInfo) => {
    if (!tasks.length) {
      toast("Add material first.");
      return;
    }
    undo = structuredClone(state);
    save();
    if (courseInfo) {
      let target = projects.find((p) => p.courseId === courseInfo.id);
      if (!target) {
        const deadline = courseInfo.exam || addDays(iso(), 14);
        target = {
          version: 1,
          projectId: crypto.randomUUID(),
          courseId: courseInfo.id,
          demo: false,
          title: courseInfo.name + " study plan",
          course: courseInfo.name,
          goal: courseInfo.goal,
          deadline,
          tasks: [],
          availability: {},
          omitted: [],
          history: [],
          created: iso(),
        };
        for (
          let d = iso(), i = 0;
          d <= deadline && i < 91;
          d = addDays(d, 1), i++
        )
          target.availability[d] =
            new Date(d + "T12:00:00").getDay() === 0 ? 0 : 45;
      }
      state = structuredClone(target);
    }
    for (const task of tasks) {
      if (state.tasks.length >= 50) break;
      if (
        task.sourceTopic &&
        state.tasks.some(
          (t) => t.sourceTopic === task.sourceTopic && t.completed < t.estimate,
        )
      )
        continue;
      state.tasks.push({
        ...task,
        id: crypto.randomUUID(),
        completed: 0,
        optional: false,
      });
    }
    state.schedule = current();
    save();
    view = "plan";
    render();
    close();
    toast("Study tasks added. Set your realistic availability next.");
  },
});
render();
