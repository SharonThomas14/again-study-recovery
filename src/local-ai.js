import { validateOutput } from "./ai-output.js";
let engine,
  loading = false,
  controller;
export const localStatus = {
  ready: false,
  loading: false,
  text: "Local AI · not downloaded",
};
const MODEL =
  "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/41ba88dbac95fed2528c92514c131d73eb5a174b/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
export async function loadLocalAI(onStatus = () => {}) {
  if (localStatus.ready) return;
  if (loading) throw Error("The model is already loading.");
  loading = true;
  localStatus.loading = true;
  const update = (text) => {
    localStatus.text = text;
    onStatus(text);
  };
  try {
    update("Preparing local AI runtime…");
    const { Wllama } = await import("../vendor/wllama/index.js");
    engine = new Wllama(
      {
        "single-thread/wllama.wasm": new URL(
          "../vendor/wllama/single-thread/wllama.wasm",
          import.meta.url,
        ).href,
      },
      {
        allowOffline: true,
        logger: { debug() {}, log() {}, warn() {}, error() {} },
      },
    );
    await engine.loadModelFromUrl(MODEL, {
      n_ctx: 4096,
      n_batch: 128,
      n_threads: 1,
      useCache: true,
      progressCallback: ({ loaded, total }) =>
        update(
          total
            ? `Downloading model · ${Math.round((loaded / total) * 100)}% (${Math.round(loaded / 1048576)} MB)`
            : "Downloading model…",
        ),
    });
    localStatus.ready = true;
    update("Local AI ready · Qwen 2.5 · runs on this device");
  } catch (error) {
    engine = null;
    localStatus.ready = false;
    update(
      "Local AI could not load. Check your connection and free memory, then retry.",
    );
    throw Error(localStatus.text + " " + error.message);
  } finally {
    loading = false;
    localStatus.loading = false;
  }
}
export function stopLocalAI() {
  controller?.abort();
}
export async function runLocalAI(role, context, onProgress = () => {}) {
  if (!localStatus.ready)
    throw Error(
      "Download the free local AI model in AI settings first. No API key or account is needed.",
    );
  const instructions = {
    planner:
      "List exactly four short actions the student should take to complete the assignment. Use a numbered list, one action per line. Do not write the assignment itself. Do not explain. Each action must be under 18 words.",
    mentor:
      "You are a study mentor. Answer with exactly two questions to guide the student and one next action. Keep under 100 words. Do not invent facts or statistics.",
    report:
      "Write a report outline with short draft paragraphs using only supplied notes. Use headings. Write [EVIDENCE NEEDED] wherever evidence is missing. No invented findings or citations. Under 300 words.",
    slides:
      "Create 4 slides. Format each as ## Slide title followed by two short bullet points. Write [EVIDENCE NEEDED] for missing facts. Under 160 words.",
  };
  const concise = {
    title: context.title,
    mode: context.mode,
    brief: String(context.brief || "").slice(0, 2200),
    rubric: String(context.rubric || "").slice(0, 1200),
    notes: String(context.studentNotes || "").slice(0, 1800),
    mission: context.currentMission?.title,
    ...(role === "mentor"
      ? {
          question: context.conversation?.at(-1)?.text || "",
          recent: context.conversation
            ?.slice(-2)
            .map((x) => ({ role: x.role, text: x.text.slice(0, 250) })),
        }
      : {}),
  };
  const request =
    role === "planner"
      ? `A student needs to complete this assignment: \"${concise.brief}\". The marking criteria are: ${concise.rubric}. Do NOT write the assignment. Instead, ${instructions.planner}`
      : role === "slides"
        ? `Prepare a presentation outline about this assignment: ${concise.brief}. Student notes: ${concise.notes}. ${instructions.slides}`
        : "Student context: " +
          JSON.stringify(concise) +
          "\n" +
          instructions[role];
  const messages = [
    {
      role: "system",
      content: "You are a concise learning coach. Follow the requested format.",
    },
    { role: "user", content: request },
  ];
  controller = new AbortController();
  let last = 0;
  const text = await engine.createChatCompletion(messages, {
    nPredict:
      role === "planner"
        ? 160
        : role === "slides"
          ? 350
          : role === "report"
            ? 500
            : 180,
    useCache: false,
    abortSignal: controller.signal,
    sampling: { temp: 0.1, top_k: 30, top_p: 0.85, penalty_repeat: 1.1 },
    onNewToken: (_token, _piece, current, controls) => {
      if (Date.now() - last > 600) {
        last = Date.now();
        onProgress(current);
      }
    },
  });
  if (controller.signal.aborted)
    throw Error("Generation stopped. Existing work is unchanged.");
  if (role === "planner" || role === "slides")
    return parseLocalOutline(role, text);

  return validateOutput(role, { text: text.trim() });
}

export function parseLocalOutline(role, text) {
  if (role === "planner") {
    const tasks = text
      .split(/\n/)
      .map((line) => line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+)/)?.[1])
      .filter(Boolean);
    if (tasks.length < 2 || tasks.length > 10)
      throw Error(
        "The local model did not produce a usable task list. Shorten the brief and retry; existing work is unchanged.",
      );
    return validateOutput(role, {
      summary:
        "AI-generated action list. Each starts with a 30-minute placeholder budget; customise the time and add rubric details before applying.",
      steps: tasks.map((title) => ({
        title: title.replace(/\*\*/g, "").trim(),
        estimate: 30,
        note: "Complete this action using your brief and sources. Set a realistic time estimate and check the relevant rubric criterion.",
        rubric: "",
      })),
    });
  }
  const sections = text
    .split(/(?=^#{1,3}\s+)/m)
    .filter((x) => /^#{1,3}\s+/.test(x.trim()));
  if (sections.length < 2)
    throw Error(
      "The small local model did not produce a usable outline. Try a shorter brief. Your existing work is unchanged.",
    );
  return validateOutput(role, {
    slides: sections.map((section) => {
      const [heading, ...body] = section.trim().split("\n");
      return {
        title: heading.replace(/^#+\s*/, ""),
        body: body.join("\n").trim(),
        notes: "Review claims and add your supporting evidence.",
      };
    }),
  });
}
