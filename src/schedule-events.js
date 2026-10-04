// The planner stores study work as dated sessions. Share this mapping between
// Home and Calendar so a task cannot appear in one view but disappear in the other.
export function projectScheduleEvents(projects) {
  return projects.flatMap((project) =>
    (project.schedule?.days || []).flatMap((day) =>
      (day.sessions || []).map((session, index) => ({
        id: `${project.projectId}-${session.taskId}-${day.date}-${index}`,
        projectId: project.projectId,
        project: project.title,
        title: session.title,
        date: day.date,
        minutes: session.minutes,
        type: "Task",
      })),
    ),
  );
}
