import test from "node:test";
import assert from "node:assert/strict";
import { readBusyCalendar, freeMinutes } from "../src/calendar-core.js";
import { validateOutput } from "../lib/agents.js";
import { latexDocument, reportBlob, presentation } from "../src/export-core.js";
import handler from "../api/agent.js";
const date = "2026-10-03";
test("overlapping calendar events count once and daily cap is respected", () => {
  const busy = [
    { start: date + "T09:00:00", end: date + "T11:00:00" },
    { start: date + "T10:00:00", end: date + "T12:00:00" },
  ];
  assert.equal(freeMinutes(busy, date, 9, 13, 480), 60);
  assert.equal(freeMinutes([], date, 9, 21, 120), 120);
});
test("recurring calendar events and exceptions become busy intervals", () => {
  const text =
    "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:a\r\nDTSTART:20261003T090000\r\nDTEND:20261003T100000\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE:20261004T090000\r\nEND:VEVENT\r\nEND:VCALENDAR";
  const busy = readBusyCalendar(
    text,
    new Date("2026-10-03T00:00:00"),
    new Date("2026-10-06T00:00:00"),
  );
  assert.equal(busy.length, 2);
  assert.equal(freeMinutes(busy, date, 9, 10, 480), 0);
});
test("all-day busy events and transparent events are handled", () => {
  const text =
    "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:a\nDTSTART;VALUE=DATE:20261003\nDTEND;VALUE=DATE:20261004\nEND:VEVENT\nBEGIN:VEVENT\nUID:b\nDTSTART:20261003T110000\nDTEND:20261003T120000\nTRANSP:TRANSPARENT\nEND:VEVENT\nEND:VCALENDAR";
  const busy = readBusyCalendar(
    text,
    new Date(date + "T00:00:00"),
    new Date("2026-10-04T00:00:00"),
  );
  assert.equal(busy.length, 1);
  assert.equal(freeMinutes(busy, date), 0);
});
test("AI plans reject empty outputs and clamp estimates", () => {
  assert.throws(() => validateOutput("planner", { steps: [] }));
  assert.throws(() =>
    validateOutput("planner", {
      steps: [{ title: "Task", estimate: "sixty" }],
    }),
  );
  assert.equal(
    validateOutput("planner", { steps: [{ title: "Task", estimate: 900 }] })
      .steps[0].estimate,
    240,
  );
});
test("LaTeX treats student content as text, never executable commands", () => {
  const tex = latexDocument("A & B", "50% \\input{secret}");
  assert.match(tex, /50\\%/);
  assert.ok(!tex.includes("\\input{secret}"));
  assert.match(tex, /fontspec/);
});
test("Word and presentation exports are real zip-based Office files", async () => {
  const blob = await reportBlob("Test", "Evidence needed.");
  const buffer = Buffer.from(await blob.arrayBuffer());
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const deck = presentation("Test", [
    {
      title: "Question",
      body: "Evidence\nRecommendation",
      notes: "Verify sources.",
    },
  ]);
  const data = await deck.write({ outputType: "nodebuffer" });
  assert.equal(data.subarray(0, 2).toString(), "PK");
});
test("unconfigured AI fails closed without calling a provider", async () => {
  const old = process.env.AGAIN_ACCESS_TOKEN;
  delete process.env.AGAIN_ACCESS_TOKEN;
  let body;
  const res = {
    setHeader() {},
    end(value) {
      body = JSON.parse(value);
    },
  };
  await handler(
    { method: "POST", headers: {}, body: { role: "planner" } },
    res,
  );
  assert.equal(res.statusCode, 503);
  assert.match(body.error, /not configured/);
  if (old) process.env.AGAIN_ACCESS_TOKEN = old;
});

test("local AI task lists reject prose and disclose placeholder time budgets", async () => {
  const { parseLocalOutline } = await import("../src/local-ai.js");
  assert.throws(() => parseLocalOutline("planner", "An unstructured answer."));
  const plan = parseLocalOutline(
    "planner",
    "1. Read the brief\n2. Compare two sources\n3. Draft the argument\n4. Check the rubric",
  );
  assert.equal(plan.steps.length, 4);
  assert.equal(plan.steps[1].title, "Compare two sources");
  assert.equal(plan.steps[0].estimate, 30);
  assert.match(plan.summary, /placeholder/);
});
