export function validateOutput(role, data) {
  if (!data || typeof data !== "object")
    throw Error("The model returned an invalid result. Please retry.");
  if (role === "planner") {
    if (
      !Array.isArray(data.steps) ||
      data.steps.length < 1 ||
      data.steps.length > 30
    )
      throw Error("The plan did not contain a usable set of steps.");
    return {
      summary: String(data.summary || "").slice(0, 3000),
      steps: data.steps.map((s) => {
        if (
          typeof s.title !== "string" ||
          !s.title.trim() ||
          !Number.isFinite(s.estimate)
        )
          throw Error("A generated step needs a title and duration.");
        return {
          title: s.title.slice(0, 180),
          estimate: Math.max(5, Math.min(240, Math.round(s.estimate))),
          note: String(s.note || "").slice(0, 4000),
          rubric: String(s.rubric || "").slice(0, 2000),
          deliverable: String(s.deliverable || "").slice(0, 1000),
          query: String(s.query || s.title).slice(0, 200),
        };
      }),
    };
  }
  if (role === "slides") {
    if (
      !Array.isArray(data.slides) ||
      !data.slides.length ||
      data.slides.length > 20
    )
      throw Error("The slide outline was invalid.");
    return {
      slides: data.slides.map((s) => ({
        title: String(s.title || "").slice(0, 160),
        body: String(s.body || "").slice(0, 1000),
        notes: String(s.notes || "").slice(0, 4000),
      })),
    };
  }
  if (typeof data.text !== "string" || !data.text.trim())
    throw Error("The model returned an empty answer.");
  return { text: data.text.slice(0, 45000) };
}
