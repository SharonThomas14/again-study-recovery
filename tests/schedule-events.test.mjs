import test from 'node:test';
import assert from 'node:assert/strict';
import { projectScheduleEvents } from '../src/schedule-events.js';

test('project study sessions retain their dates and project identity for Home and Calendar', () => {
  const projects = [{
    projectId: 'campus',
    title: 'Design for a better campus',
    schedule: { days: [{ date: '2026-10-04', sessions: [
      { taskId: 'compare', title: 'Compare two approaches', minutes: 40 },
      { taskId: 'argument', title: 'Build your argument', minutes: 20 },
    ] }] },
  }];
  assert.deepEqual(projectScheduleEvents(projects).map(({ projectId, project, title, date, minutes }) =>
    ({ projectId, project, title, date, minutes })), [
    { projectId: 'campus', project: 'Design for a better campus', title: 'Compare two approaches', date: '2026-10-04', minutes: 40 },
    { projectId: 'campus', project: 'Design for a better campus', title: 'Build your argument', date: '2026-10-04', minutes: 20 },
  ]);
});
