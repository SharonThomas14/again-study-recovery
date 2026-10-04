export function removeCourseData(data, courseId) {
  const removed = data.courses.find((course) => course.id === courseId);
  if (!removed) return null;
  const courses = data.courses.filter((course) => course.id !== courseId);
  const cardIds = new Set(removed.topics.flatMap((topic) => topic.cards.map((card) => card.id)));
  const savedFileIds = removed.documents
    .filter((document) => document.kind === "pdf" || document.kind === "attachment")
    .map((document) => document.id);
  return {
    removed,
    savedFileIds,
    data: {
      ...data,
      courses,
      attempts: data.attempts.filter((attempt) => !cardIds.has(attempt.cardId)),
      selected: data.selected === courseId ? courses[0]?.id || null : data.selected,
      reminder: data.reminder?.courseId === courseId || data.reminder?.title === `Study ${removed.name}`
        ? null : data.reminder,
    },
  };
}

export function withoutCourseProjects(projects, courseId) {
  return projects.filter((project) => project.courseId !== courseId);
}
