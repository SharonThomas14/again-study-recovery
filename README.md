# ReStride
### Room to begin again.

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
- Multiple courses and projects, goals and deadlines, with confirmed course deletion that clears linked study plans and saved materials.
- PDF uploads up to 600 pages and 100 MB, plus TXT, Markdown and pasted material; source page attribution and per-file removal.
- Generated and manual topics, individual or multi-topic editing/removal, personal notes, quizzes and flashcards.
- Practice evidence dashboard and course topics converted to study tasks.
- Assignment process guidance rather than generated submissions.
- Decimal-hour estimates and calendar-suggested availability with daily manual overrides, ordered work, missed-session recovery, explicit optional-work deferral and honest overflow.
- Focus timer, completion logging, undo, workspace backups and calendar export.
- Open-page notifications and downloadable calendar reminders.

## Deliberate limits
This is a deterministic prototype, not a semantic AI tutor. Extracted notes and questions need review. Large PDFs yield a sample of up to 60 practice topics across the document. Scanned PDFs need OCR for practice topics; mathematical notation, diagrams and complex layouts are not reliably interpreted. No cloud sync, accounts or server push. Device-local data can be lost if browser storage is cleared. JSON backups include course metadata and practice history, but not original uploaded files or large PDF page text; keep your original files separately. Quiz coverage is not predicted exam performance. Calendar availability uses a suggested 6–8 pm weekday and 10 am–1 pm weekend study window, subtracts calendar events, and supports manual overrides. Imported Google and Canvas calendars require a new .ics import to refresh. Study sessions are assigned to dates, not exact free-time slots, and course projects do not share a single daily capacity.

## Architecture
Vanilla ES modules with no frontend framework. `planner.js` is a pure capacity-constrained sequential scheduler. `learning.js` extracts source-grounded drafts and computes practice metrics. `campus.js` manages courses and practice. `app.js` manages the study desk and project library. PDF.js is the sole production package and is copied into the static build. No secret API keys are required.

Dates are local calendar dates; study plans include the due date. Sessions are at most 50 minutes. Work is never allocated above a date's suggested or manually adjusted capacity. Required tasks cannot be omitted via the optional-work control. The engine does not infer rest time or academic importance.

## Deployment
GitHub Actions runs tests, builds and deploys `dist/` to GitHub Pages. Enable Pages with GitHub Actions as its source. `vercel.json` also supports static deployment through Vercel.

For local development after a clean clone, `pnpm build` creates the vendored PDF assets used by `pnpm dev` (the server serves `dist/` vendor paths if source vendor files are absent).

## Product evidence
- [Research and validation plan](docs/RESEARCH.md)
- [Judging rubric and three-minute demo](docs/HACKATHON.md)

The work is a testable hypothesis, not a claim of product-market fit. No student interviews or paid validation have been fabricated.
