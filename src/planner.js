export const iso = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function addDays(day, n) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function daysBetween(a, b) {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export function dateLabel(
  day,
  opts = { weekday: "short", day: "numeric", month: "short" },
) {
  return new Date(day + "T12:00:00").toLocaleDateString("en-AU", opts);
}
export const minutes = (n) =>
  n >= 60
    ? `${Math.floor(n / 60)}h${n % 60 ? " " + (n % 60) + "m" : ""}`
    : `${n}m`;
export function plan(tasks, availability, start, deadline, omitted = []) {
  const exclude = new Set(omitted);
  const days = Object.entries(availability)
    .filter(([d]) => d >= start && d <= deadline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, capacity]) => ({
      date,
      capacity: Math.max(0, Math.floor(Number(capacity) || 0)),
      used: 0,
      sessions: [],
    }));
  const unscheduled = [];
  const skipped = [];
  let cursor = 0;
  let required = 0;
  for (const task of tasks) {
    const remaining = Math.max(0, task.estimate - task.completed);
    if (!remaining) continue;
    if (exclude.has(task.id) && task.optional) {
      skipped.push({ ...task, remaining });
      continue;
    }
    required += remaining;
    let rest = remaining;
    while (rest > 0 && cursor < days.length) {
      const day = days[cursor],
        room = day.capacity - day.used;
      if (room <= 0) {
        cursor++;
        continue;
      }
      const length = Math.min(rest, room, 50);
      day.sessions.push({
        taskId: task.id,
        title: task.title,
        minutes: length,
        optional: task.optional,
      });
      day.used += length;
      rest -= length;
    }
    if (rest)
      unscheduled.push({
        taskId: task.id,
        title: task.title,
        minutes: rest,
        optional: task.optional,
      });
  }
  const capacity = days.reduce((s, d) => s + d.capacity, 0),
    overflow = unscheduled.reduce((s, t) => s + t.minutes, 0);
  const last = [...days].reverse().find((d) => d.used > 0);
  return {
    days,
    unscheduled,
    skipped,
    required,
    capacity,
    overflow,
    slack: Math.max(0, capacity - required),
    finish: last?.date ?? start,
    bufferDays: overflow
      ? 0
      : Math.max(0, daysBetween(last?.date ?? start, deadline)),
    feasible: overflow === 0,
  };
}
export function parseInterruption(text) {
  const s = text.toLowerCase();
  let amount = null;
  const m =
    s.match(
      /(?:only\s+have|have|got|only|just)\s+(\d+(?:\.\d+)?)\s*(minutes?|mins?|m\b|hours?|hrs?|h\b)/,
    ) || s.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|m\b|hours?|hrs?|h\b)/);
  if (m) amount = Math.round(Number(m[1]) * (/^(h|hour)/.test(m[2]) ? 60 : 1));
  if (/(?:no time|zero minutes|can't study|cannot study)/.test(s)) amount = 0;
  return {
    minutes: amount === null ? null : Math.min(480, amount),
    missed: /missed|couldn't|didn't|did not/.test(s),
  };
}
export function makeDemo(today = iso()) {
  const tasks = [
    [
      "stakeholders",
      "Identify your stakeholders",
      20,
      false,
      "List everyone affected by the proposal. Beside each name, write one thing they need.",
    ],
    [
      "compare",
      "Compare two approaches",
      60,
      false,
      "Create a two-column comparison. Add evidence, benefits and limitations for each approach.",
    ],
    [
      "outline",
      "Build your argument",
      35,
      false,
      "Write your central claim, then three supporting points. Link each point to evidence.",
    ],
    [
      "draft",
      "Write the first draft",
      100,
      false,
      "Draft the main sections from your outline. Leave placeholders for anything that slows you down.",
    ],
    [
      "extra",
      "Add an extra case study",
      35,
      true,
      "Strengthen the argument with a second example. This is enrichment, not a core requirement in this demo.",
    ],
    [
      "review",
      "Review against the brief",
      35,
      false,
      "Check every requirement, citations and word count. Read the introduction and conclusion together.",
    ],
    [
      "submit",
      "Final check and submit",
      15,
      false,
      "Check the file opens, confirm the submission details, and save your receipt.",
    ],
  ].map(([id, title, estimate, optional, note]) => ({
    id,
    title,
    estimate,
    optional,
    note,
    completed: 0,
  }));
  const start = addDays(today, -1),
    deadline = addDays(today, 6),
    availability = {};
  [40, 60, 0, 70, 60, 60, 45, 30].forEach(
    (n, i) => (availability[addDays(start, i)] = n),
  );
  return {
    version: 1,
    demo: true,
    title: "Design for a better campus",
    course: "Design & society",
    goal: "A clear, well-supported submission",
    deadline,
    tasks,
    availability,
    omitted: [],
    schedule: plan(tasks, availability, start, deadline),
    history: [],
    created: today,
  };
}
export function validateProject(p) {
  const validDate = (d) =>
    typeof d === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    Number.isFinite(Date.parse(d + "T12:00:00")) &&
    new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
  if (
    !p ||
    !validDate(p.deadline) ||
    !Array.isArray(p.history) ||
    p.version !== 1 ||
    typeof p.title !== "string" ||
    p.title.length > 200 ||
    typeof p.goal !== "string" ||
    typeof p.course !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline) ||
    !Array.isArray(p.tasks) ||
    p.tasks.length < 1 ||
    p.tasks.length > 50 ||
    !p.availability ||
    Array.isArray(p.availability)
  )
    return false;
  const ids = new Set();
  for (const t of p.tasks) {
    if (
      typeof t.id !== "string" ||
      ids.has(t.id) ||
      typeof t.title !== "string" ||
      t.title.length > 200 ||
      typeof t.note !== "string" ||
      !Number.isInteger(t.estimate) ||
      t.estimate < 1 ||
      t.estimate > 3000 ||
      !Number.isInteger(t.completed) ||
      t.completed < 0 ||
      t.completed > t.estimate ||
      typeof t.optional !== "boolean"
    )
      return false;
    ids.add(t.id);
  }
  return (
    Object.entries(p.availability).length <= 367 &&
    Object.entries(p.availability).every(
      ([d, n]) => validDate(d) && Number.isInteger(n) && n >= 0 && n <= 480,
    ) &&
    Array.isArray(p.omitted) &&
    p.omitted.every((id) => ids.has(id))
  );
}
