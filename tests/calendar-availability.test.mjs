import test from "node:test";
import assert from "node:assert/strict";
import { studyAvailability, parseHours, hourInput } from "../src/calendar-availability.js";

test("calendar events reduce suggested study time without double-counting overlaps", () => {
  const result = studyAvailability([
    { date: "2026-10-05", start: "18:30", end: "19:30", type: "Class" },
    { date: "2026-10-05", start: "19:00", end: "20:00", type: "Other" },
    { date: "2026-10-05", start: "18:45", end: "19:15", type: "Study session" },
    { date: "2026-10-06", start: "", type: "Exam" },
  ], "2026-10-05", "2026-10-06");
  assert.equal(result["2026-10-05"], 30);
  assert.equal(result["2026-10-06"], 0);
});

test("hours accept at most two decimals and convert to whole scheduling minutes", () => {
  assert.equal(parseHours("1.25"), 75);
  assert.equal(parseHours("0.33"), 20);
  assert.equal(parseHours("0.00"), null);
  assert.equal(parseHours("0.00", { allowZero: true }), 0);
  assert.equal(parseHours("1.234"), null);
  assert.equal(hourInput(75), "1.25");
});

test("multi-day and weekly calendar commitments block their study windows", () => {
  const result = studyAvailability([
    { date: "2026-10-05", endDate: "2026-10-06", start: "", type: "Other" },
    { date: "2026-10-07", start: "18:00", end: "19:00", repeat: true, repeatUntil: "2026-10-14", type: "Class" },
  ], "2026-10-05", "2026-10-15");
  assert.equal(result["2026-10-05"], 0);
  assert.equal(result["2026-10-06"], 0);
  assert.equal(result["2026-10-07"], 60);
  assert.equal(result["2026-10-14"], 60);
  assert.equal(result["2026-10-15"], 120);
});
