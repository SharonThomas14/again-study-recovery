# Assignment Studio — product and integration decision

Updated 3 October 2026. This is desk research and a testable product proposal, not proof of market demand.

## Product decision

Keep Again centred on **getting back into an achievable learning plan**. Add a single assignment workspace because briefs, rubrics, tasks, evidence and drafts otherwise become disconnected. The four specialist roles share the assignment context: planner, mentor, report editor and presentation editor. A “mission” has a concrete action, expected artefact, estimated effort and rubric mapping. Timed work is voluntary; no shame streaks or invented grades.

A general-purpose “upload PDF, generate notes/slides” pitch is weak differentiation: existing study products already provide substantial overlap (see RESEARCH.md). The investable hypothesis is a continuous rubric-to-recovery journey with visible trade-offs and portable student-owned work. Avoid claiming novelty in automatic rescheduling or document generation.

## Validation before investing further

Recruit 12 students with a real deadline, including students with paid work/caring commitments. Do not collect private course documents without their agreement. Compare the existing recovery-first workflow with the new assignment studio, counterbalancing order. Observe a real interrupted plan rather than asking only whether the concept sounds useful.

Pre-register practical gates: at least 8/12 correctly explain which required work no longer fits; at least 8/12 start their revised next task without researcher help; at least 6/12 voluntarily return in the next week. Record median time to resume, failed task starts, source-quality mistakes and estimate corrections. Explore willingness to pay only after observed use. These are proposed decision thresholds, not achieved results. Test whether generated drafting helps reasoning or merely attracts users seeking completed submissions.

## Supported integrations and boundaries

- **RMIT Val:** [official service description](https://www.rmit.edu.au/students/support-services/study-support/val) supports learning conversations and university access. The reviewed public materials do not document a third-party API. Implement a copy-context handoff to the official service, not an invented integration or SSO bypass. [RMIT AI in learning](https://www.rmit.edu.au/students/my-course/ai-in-learning) is linked in the UI.
- **Google Calendar:** [OAuth token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) and [free/busy query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query). Requires the owner's registered OAuth web client, enabled Calendar API and allowed origins. Reads primary-calendar busy intervals only. Token is not persisted. Daily budgets require student review; a free calendar does not imply free energy.
- **Apple/Outlook/Google universal route:** .ics snapshot import, with recurrence expansion and overlap merging. No claim of live Apple sync. Export is a separate existing reminder feature.
- **Research papers:** [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) returns actual DOI metadata. Metadata existence does not prove relevance, quality or support for a claim. The model receives metadata, not full papers. YouTube/blog links are clearly labelled searches, not verified recommendations. Full curated video/blog discovery remains an extension requiring a search integration and quality review.
- **Generation:** Server-side [OpenAI Responses JSON output](https://developers.openai.com/api/docs/guides/structured-outputs) or [Gemini generateContent](https://ai.google.dev/api/generate-content), with a configured model and key. No fake local AI fallback. Local schedulers retain responsibility for capacity feasibility.
- **Editable exports:** genuine DOCX and PPTX files. PPTX can be imported into Canva/Google Slides, but no direct account integration is claimed. LaTeX download targets Overleaf with XeLaTeX; PDF uses browser print. Import fidelity and full export layout need cross-application testing with real assignments.

## Design direction

Reviewed [ThreeUI](https://threeui.com/), [21st](https://21st.dev/), and [Taste Skill](https://www.tasteskill.dev/docs). Applied original editorial composition, strong typographic hierarchy, quiet orbital motion, numbered journey tabs and progressive disclosure. No restricted component code was copied. Motion has reduced-motion overrides. The working surface stays calm; animation never blocks a student action.

## Hackathon demonstration

1. Paste brief and rubric; choose assignment or syllabus mode.
2. On a configured AI deployment, generate and review missions; edit a duration and reorder a step.
3. Import calendar busy time and reduce the suggested budget to something realistic.
4. Start a focus session; use context-specific mentor support and record evidence.
5. Show a missed session and the honest recovery shortfall.
6. Edit a report/slide outline and export a real file.

On the static GitHub Pages deployment, demonstrate editing, focus, research, calendar import and exports. Disclose that live model calls require the Vercel backend credentials; do not stage generated results as live AI.
