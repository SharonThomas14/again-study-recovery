import { iso, addDays } from "./planner.js";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let api,
  mode = "week",
  anchor = iso(),
  undo;
let db = {
  name: "Student",
  theme: "dark",
  size: "normal",
  photo: "",
  events: [],
};
function safeProfile(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.events))
    throw Error("Invalid profile/calendar backup.");
  const events = value.events
    .filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        Number.isFinite(+new Date(e.date + "T12:00")) &&
        (e.time === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) &&
        Number.isFinite(e.duration) &&
        e.duration > 0 &&
        e.duration <= 527040,
    )
    .slice(0, 15000)
    .map((e) => ({
      id: e.id.slice(0, 500),
      title: e.title.slice(0, 200),
      date: e.date,
      time: e.time,
      duration: e.duration,
      kind: ["study", "exam", "class", "task", "other", "busy"].includes(e.kind)
        ? e.kind
        : "other",
      repeat: e.repeat === true,
      until: /^\d{4}-\d{2}-\d{2}$/.test(e.until) ? e.until : undefined,
    }));
  return {
    name:
      typeof value.name === "string"
        ? value.name.slice(0, 70) || "Student"
        : "Student",
    theme: value.theme === "light" ? "light" : "dark",
    size: value.size === "large" ? "large" : "normal",
    photo:
      typeof value.photo === "string" &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
        value.photo,
      ) &&
      value.photo.length < 500000
        ? value.photo
        : "",
    events,
  };
}
try {
  const saved = localStorage.getItem("again.personal.v1");
  if (saved) db = safeProfile(JSON.parse(saved));
} catch {}
export const personalExport = () => structuredClone(db);
export function personalRestore(value) {
  db = safeProfile(value);
  save();
  applySettings();
}
function save() {
  try {
    localStorage.setItem("again.personal.v1", JSON.stringify(db));
  } catch {
    api?.toast("Storage is full. Export a backup before leaving.");
  }
}
export function numericDate(date) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
}
function applySettings() {
  document.documentElement.dataset.theme =
    db.theme === "light" ? "light" : "dark";
  document.documentElement.dataset.font =
    db.size === "large" ? "large" : "normal";
  document
    .querySelectorAll(".profile-name")
    .forEach((el) => (el.textContent = db.name));
  document.querySelectorAll(".profile-avatar").forEach((el) => {
    el.innerHTML =
      db.photo?.startsWith("data:image/") &&
      !db.photo.startsWith("data:image/svg")
        ? `<img src="${esc(db.photo)}" alt="Profile photo">`
        : esc((db.name || "S").slice(0, 1).toUpperCase());
  });
}
export function profileScreen() {
  return `<section class="page-heading"><span class="eyebrow">YOUR SPACE / YOUR SETTINGS</span><h1>Make yourself<br><em>at home.</em></h1><p>The details that make this workspace yours.</p></section><div class="settings-grid"><section class="paper-panel"><span class="eyebrow">01 / PROFILE</span><div class="profile-preview"><span class="profile-avatar">${db.photo?.startsWith("data:image/jpeg") ? `<img src="${esc(db.photo)}" alt="Profile photo">` : esc(db.name.slice(0, 1))}</span><div><h2>${esc(db.name)}</h2><label class="secondary file-button">Choose a photo<input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" hidden></label></div></div><label class="field">Your name<input id="profile-name" maxlength="70" value="${esc(db.name)}"></label><button class="primary" data-personal="save-profile">Save profile ↗</button><p class="hint">Your profile stays on this device.</p></section><section class="paper-panel"><span class="eyebrow">02 / APPEARANCE</span><h2>Set the atmosphere.</h2><label class="field">Colour mode<select id="profile-theme"><option value="dark" ${db.theme === "dark" ? "selected" : ""}>Night / graphite</option><option value="light" ${db.theme === "light" ? "selected" : ""}>Day / cloud</option></select></label><label class="field">Reading size<select id="profile-size"><option value="normal" ${db.size === "normal" ? "selected" : ""}>Standard</option><option value="large" ${db.size === "large" ? "selected" : ""}>Larger text</option></select></label><button class="primary" data-personal="save-appearance">Apply preferences ↗</button><p class="hint">Animations follow your device’s reduced-motion preference. Dates display as DD/MM/YY.</p></section></div>`;
}
const colors = {
  study: "#b6d8fb",
  exam: "#f1b8cf",
  class: "#c7b5f7",
  task: "#d9f99d",
  other: "#d8cfb8",
  busy: "#8394a4",
};
export function eventsOn(date) {
  return db.events
    .filter(
      (e) =>
        e.date === date ||
        (e.repeat &&
          date >= e.date &&
          date <= (e.until || addDays(e.date, 90)) &&
          new Date(date + "T12:00").getDay() ===
            new Date(e.date + "T12:00").getDay()),
    )
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}
const chip = (e, compact = false) =>
  `<button class="calendar-event ${compact ? "compact" : ""}" style="--event-color:${colors[e.kind] || colors.other}" data-edit-event="${esc(e.id)}"><small>${esc(e.time || "ALL DAY")} · ${esc(e.kind)}</small><strong>${esc(e.title)}</strong>${!compact && e.duration ? `<span>${e.duration} min${e.repeat ? " · weekly" : ""}</span>` : ""}</button>`;
export function calendarScreen() {
  const d = new Date(anchor + "T12:00:00"),
    day = (d.getDay() + 6) % 7,
    start =
      mode === "month"
        ? addDays(
            iso(new Date(d.getFullYear(), d.getMonth(), 1, 12)),
            -(new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7,
          )
        : mode === "week"
          ? addDays(anchor, -day)
          : anchor;
  const count = mode === "month" ? 42 : mode === "week" ? 7 : 1,
    dates = Array.from({ length: count }, (_, i) => addDays(start, i));
  const title =
    mode === "month"
      ? d.toLocaleDateString("en-AU", { month: "long", year: "numeric" })
      : mode === "week"
        ? `${numericDate(start)} — ${numericDate(addDays(start, 6))}`
        : numericDate(anchor);
  return `<section class="page-heading calendar-heading"><div><span class="eyebrow">TIME, WITH ROOM FOR LIFE</span><h1>Your orbit.</h1><p>Classes, deadlines and the space to learn.</p></div><div class="calendar-motif" aria-hidden="true">◷<i>+</i></div></section><div class="calendar-toolbar"><div><button class="secondary" data-personal="today">Today</button><button class="icon-button" data-personal="previous" aria-label="Previous period">←</button><button class="icon-button" data-personal="next" aria-label="Next period">→</button><strong>${title}</strong></div><div class="view-switch">${["day", "week", "month"].map((x) => `<button data-calendar-mode="${x}" class="${mode === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div><div><button class="secondary" data-personal="connections">Connect / import ↗</button><button class="primary" data-personal="new-event">+ Add event</button></div></div>${undo ? '<button class="text-button" data-personal="undo-event">Undo last calendar change</button>' : ""}<div class="calendar-scroll"><div class="calendar-grid ${mode}">${dates
    .map(
      (date) =>
        `<section class="calendar-day ${date === iso() ? "is-today" : ""} ${date.slice(0, 7) !== anchor.slice(0, 7) ? "outside-month" : ""}"><header><small>${new Date(date + "T12:00").toLocaleDateString("en-AU", { weekday: "short" })}</small><button data-add-date="${date}" aria-label="Add event on ${numericDate(date)}">${mode === "day" ? numericDate(date) : Number(date.slice(-2))}</button></header>${eventsOn(
          date,
        )
          .map((e) => chip(e, mode === "month"))
          .join(
            "",
          )}${api.project().deadline === date ? `<div class="deadline-event">Assignment due<br><b>${esc(api.project().title)}</b></div>` : ""}${api.project().schedule?.days?.find((x) => x.date === date)?.used ? `<div class="budget-event">${api.project().schedule.days.find((x) => x.date === date).used}m planned study <small>Daily budget · choose a time</small></div>` : ""}${mode === "day" && !eventsOn(date).length ? '<div class="calendar-empty"><span>✳</span><h3>A little open space.</h3><p>Add a study session, class or deadline.</p></div>' : ""}</section>`,
    )
    .join("")}</div></div><div class="calendar-legend">${Object.entries(colors)
    .map(
      ([kind, color]) =>
        `<span><i style="background:${color}"></i>${kind}</span>`,
    )
    .join("")}<span>Local calendar · imported feeds are snapshots</span></div>`;
}
function eventForm(id, date = anchor) {
  const e = db.events.find((x) => x.id === id) || {
    date,
    time: "18:00",
    duration: 60,
    title: "",
    kind: "study",
    repeat: false,
  };
  api.modal(
    api.header(id ? "Edit your event." : "Make time for it.") +
      `<form id="event-form" data-id="${esc(id || "")}"><div class="event-types">${Object.keys(
        colors,
      )
        .filter((k) => k !== "busy")
        .map(
          (k) =>
            `<label><input type="radio" name="kind" value="${k}" ${e.kind === k ? "checked" : ""}>${k}</label>`,
        )
        .join(
          "",
        )}</div><label class="field">Title<input name="title" maxlength="140" required value="${esc(e.title)}" placeholder="e.g. Biology revision"></label><label class="field">Date (DD/MM/YY)<input name="date" type="text" inputmode="numeric" pattern="[0-9]{2}/[0-9]{2}/[0-9]{2}" value="${numericDate(e.date)}" required placeholder="03/10/26"></label><div class="form-row"><label class="field">Start time<input name="time" type="time" value="${esc(e.time || "18:00")}" required></label><label class="field">Duration (minutes)<input name="duration" type="number" min="5" max="1440" value="${e.duration || 60}" required></label></div><label class="check-label"><input type="checkbox" name="repeat" ${e.repeat ? "checked" : ""}> Repeat weekly for 12 weeks</label><p id="event-error" class="error" role="alert"></p><div class="button-row">${id ? `<button type="button" class="secondary" data-delete-event="${esc(id)}">Delete event</button>` : ""}<button class="primary">Save event ↗</button></div></form>`,
  );
}
export function parseNumericDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return null;
  const date = `20${m[3]}-${m[2]}-${m[1]}`;
  return iso(new Date(date + "T12:00:00")) === date ? date : null;
}
export function initPersonal(callbacks) {
  api = callbacks;
  applySettings();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.calendarMode) {
      mode = b.dataset.calendarMode;
      api.render();
      return;
    }
    if (b.dataset.addDate) {
      eventForm(null, b.dataset.addDate);
      return;
    }
    if (b.dataset.editEvent) {
      eventForm(b.dataset.editEvent);
      return;
    }
    if (b.dataset.deleteEvent) {
      undo = structuredClone(db.events);
      db.events = db.events.filter((x) => x.id !== b.dataset.deleteEvent);
      save();
      api.close();
      api.render();
      return;
    }
    const action = b.dataset.personal;
    if (!action) return;
    if (action === "new-event") eventForm();
    if (action === "today") {
      anchor = iso();
      api.render();
    }
    if (action === "previous" || action === "next") {
      const delta = action === "next" ? 1 : -1;
      if (mode === "month") {
        const d = new Date(anchor + "T12:00");
        anchor = iso(new Date(d.getFullYear(), d.getMonth() + delta, 1, 12));
      } else anchor = addDays(anchor, delta * (mode === "week" ? 7 : 1));
      api.render();
    }
    if (action === "undo-event") {
      db.events = undo;
      undo = null;
      save();
      api.render();
    }
    if (action === "save-profile") {
      db.name =
        document.querySelector("#profile-name").value.trim() || "Student";
      save();
      api.render();
      applySettings();
      api.toast("Profile saved.");
    }
    if (action === "save-appearance") {
      db.theme = document.querySelector("#profile-theme").value;
      db.size = document.querySelector("#profile-size").value;
      save();
      applySettings();
      api.toast("Preferences applied.");
    }
    if (action === "connections")
      api.modal(
        api.header("Bring your calendars together.") +
          `<div class="connection-card"><b>Google Calendar</b><p>Use Google’s read-only busy-time connection to suggest study availability. Requires a registered Google client on the deployed backend.</p><button class="secondary" data-action="availability">Connect Google / set availability ↗</button></div><div class="connection-card"><b>Canvas, Apple, Outlook & other calendars</b><p>In Canvas: Calendar → Calendar Feed → download the .ics file. Apple: File → Export → Export. Import that file below. Events appear here as a snapshot; import a new export to add or update them. Events deleted from the source must be removed here manually.</p><label class="secondary file-button">Import calendar file<input type="file" id="calendar-events-file" accept=".ics,text/calendar" hidden></label><p class="hint">Processed locally. Keep private Canvas feed URLs out of shared documents. This does not connect your Canvas account or continuously sync.</p></div><p id="calendar-import-status" role="status"></p>`,
      );
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "event-form") return;
    e.preventDefault();
    const f = new FormData(e.target),
      date = parseNumericDate(f.get("date"));
    if (!date) {
      document.querySelector("#event-error").textContent =
        "Enter a real date as DD/MM/YY.";
      return;
    }
    const duration = Number(f.get("duration"));
    if (!Number.isInteger(duration) || duration < 5 || duration > 1440) return;
    undo = structuredClone(db.events);
    const id = e.target.dataset.id || crypto.randomUUID();
    db.events = db.events.filter((x) => x.id !== id);
    db.events.push({
      id,
      title: f.get("title").trim(),
      date,
      time: f.get("time"),
      duration,
      kind: f.get("kind") || "other",
      repeat: f.has("repeat"),
      until: addDays(date, 84),
    });
    save();
    api.close();
    api.render();
    api.toast("Event saved.");
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id === "profile-photo") {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > 5000000
        )
          throw Error("Choose a PNG, JPEG or WebP under 5 MB.");
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 160;
        const ctx = canvas.getContext("2d"),
          side = Math.min(bitmap.width, bitmap.height);
        ctx.drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          160,
          160,
        );
        db.photo = canvas.toDataURL("image/jpeg", 0.85);
        bitmap.close();
        save();
        applySettings();
        api.toast("Photo updated.");
      } catch (error) {
        api.toast(error.message);
      }
    }
    if (e.target.id === "calendar-events-file") {
      const status = document.querySelector("#calendar-import-status");
      try {
        const file = e.target.files[0];
        if (!file) return;
        const { readBusyCalendar } = await import("../vendor/calendar-core.js");
        const rows = readBusyCalendar(
          await file.text(),
          new Date(addDays(iso(), -31) + "T00:00"),
          new Date(addDays(iso(), 366) + "T00:00"),
          true,
        );
        undo = structuredClone(db.events);
        for (const r of rows) {
          const start = new Date(r.start),
            date = iso(start),
            time = r.allDay ? "" : start.toTimeString().slice(0, 5),
            id = "import-" + r.uid + "-" + r.start;
          db.events = db.events.filter((e) => e.id !== id);
          db.events.push({
            id,
            date,
            time,
            duration: Math.round((new Date(r.end) - start) / 60000),
            title: r.title || "Imported busy time",
            kind: "busy",
            repeat: false,
          });
        }
        save();
        status.textContent =
          rows.length +
          " event occurrences imported. Close this dialog to see them.";
        api.render();
      } catch (error) {
        status.textContent = error.message;
      }
    }
  });
}
export function personalBusy(dates) {
  return dates.flatMap((date) =>
    eventsOn(date)
      .filter((e) => e.kind !== "study" && e.kind !== "task")
      .map((e) => {
        const start = new Date(date + "T" + (e.time || "00:00") + ":00");
        return {
          start: start.toISOString(),
          end: new Date(
            +start + (e.time ? e.duration : 1440) * 60000,
          ).toISOString(),
        };
      }),
  );
}
