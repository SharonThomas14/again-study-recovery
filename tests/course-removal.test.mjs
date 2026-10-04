import test from "node:test";
import assert from "node:assert/strict";
import { removeCourseData, withoutCourseProjects } from "../src/course-removal.js";

test("deleting a course removes only its data and linked plans", () => {
  const first = {
    id: "course-a", name: "Biology",
    documents: [{ id: "pdf-a", kind: "pdf" }, { id: "notes-a", kind: "upload" }],
    topics: [{ id: "topic-a", cards: [{ id: "card-a" }] }],
  };
  const second = {
    id: "course-b", name: "History",
    documents: [{ id: "file-b", kind: "attachment" }],
    topics: [{ id: "topic-b", cards: [{ id: "card-b" }] }],
  };
  const original = {
    courses: [first, second], selected: "course-a",
    attempts: [{ cardId: "card-a" }, { cardId: "card-b" }],
    reminder: { courseId: "course-a", title: "Study Biology" },
  };
  const result = removeCourseData(original, "course-a");
  assert.deepEqual(result.savedFileIds, ["pdf-a"]);
  assert.deepEqual(result.data.courses, [second]);
  assert.deepEqual(result.data.attempts, [{ cardId: "card-b" }]);
  assert.equal(result.data.selected, "course-b");
  assert.equal(result.data.reminder, null);
  assert.equal(original.courses.length, 2);

  const plans = [
    { projectId: "plan-a", courseId: "course-a" },
    { projectId: "plan-b", courseId: "course-b" },
    { projectId: "assignment", course: "Biology" },
  ];
  assert.deepEqual(withoutCourseProjects(plans, "course-a"), plans.slice(1));
});

test("a missing course does not remove anything", () => {
  assert.equal(removeCourseData({ courses: [], attempts: [] }, "missing"), null);
});
