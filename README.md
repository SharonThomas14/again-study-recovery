# ReStrive
### Your next move starts here.

A student learning and recovery-planning prototype. Course material becomes source-linked notes and practice; unfinished work becomes an achievable next step with explicit trade-offs.

## Run
Requires Node 24 and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

Open http://127.0.0.1:4173. The development server is loopback-only. The build produces static files in `dist/`.

```sh
pnpm test
```

## What works
- Multiple courses and projects, goals and deadlines.
- Graphite/cloud appearance, larger reading text and device-local name/photo profile.
- Day/week/month calendar, manual events, weekly repeats and Canvas/Apple/Outlook .ics snapshots.
- Text-based PDF, TXT, Markdown and pasted material; source page attribution.
- Topic excerpts, personal notes, cloze recall quizzes and self-rated flashcards.
- Practice evidence dashboard and course topics converted to study tasks.
- Assignment and syllabus mission planning, contextual mentor, editable report and slide drafts.
- Daily availability, ordered work, missed-session recovery, explicit optional-work deferral, honest overflow.
- Focus timer, completion logging, undo, workspace backups and calendar export.
- Open-page notifications and downloadable calendar reminders.

## Deliberate limits
This is a working prototype with a deterministic recovery scheduler and an optional downloaded AI model. The small local model can be slow and factually wrong; inspect every result. Extracted notes and questions need review. Scanned PDFs need OCR elsewhere; mathematical notation, diagrams and complex layouts are not reliably interpreted. No cloud sync, accounts or server push. Device-local data can be lost if browser storage is cleared; use backups. Quiz coverage is not predicted exam performance. Imported busy intervals can suggest daily budgets; planned sessions still need a chosen time. Course projects are planned independently, so availability is not shared across multiple projects yet.

## Architecture
Vanilla ES modules with no frontend framework. `planner.js` is a pure capacity-constrained sequential scheduler. `learning.js` extracts source-grounded drafts and computes practice metrics. `campus.js` manages courses and practice. `app.js` manages the study desk and project library. PDF.js extracts text, ical.js expands calendar feeds, docx/PptxGenJS create Office exports, and Wllama runs a downloaded Qwen model in the browser. No secret API keys are required for local AI.

Dates are local calendar dates; study plans include the due date. Sessions are at most 50 minutes. Work is never allocated above a date's declared minutes. Required tasks cannot be omitted via the optional-work control. The engine does not infer rest time or academic importance.

## Deployment
GitHub Actions runs tests, builds and deploys `dist/` to GitHub Pages. Enable Pages with GitHub Actions as its source. `vercel.json` also supports Vercel hosting with optional server-side AI functions.

For local development after a clean clone, `pnpm build` creates the vendored PDF assets used by `pnpm dev` (the server serves `dist/` vendor paths if source vendor files are absent).

## Product evidence
- [Research and validation plan](docs/RESEARCH.md)
- [Judging rubric and three-minute demo](docs/HACKATHON.md)

The work is a testable hypothesis, not a claim of product-market fit. No student interviews or paid validation have been fabricated.

## Assignment Studio

The new **Assignment studio** navigation contains brief/rubric uploads, assignment or syllabus mode, editable missions, focus timer, contextual mentor interface, report and slide editors, Crossref paper discovery, and real DOCX/PPTX/LaTeX exports. Calendar availability supports .ics imports and a configurable Google OAuth connection. RMIT Val is an explicit copy-context handoff.

Free local AI runs on GitHub Pages after a one-time ~400 MB model download. It uses CPU WebAssembly, caches the model in the browser, and needs enough device memory. An optional cloud mode uses the included Vercel backend and server credentials. See [AI setup](docs/AI-SETUP.md) and [product/integration research](docs/STUDIO-RESEARCH.md). The shared-code backend is a trusted pilot, not a public multi-tenant service.

## Brand and compatibility
ReStrive uses the owner-supplied PNG mark. The existing repository URL, storage keys and backup format retain their original identifiers so returning users keep their work.
