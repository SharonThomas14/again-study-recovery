# Again
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
- Multiple courses and projects, goals and deadlines.
- Text-based PDF, TXT, Markdown and pasted material; source page attribution.
- Topic excerpts, personal notes, cloze recall quizzes and self-rated flashcards.
- Practice evidence dashboard and course topics converted to study tasks.
- Assignment process guidance rather than generated submissions.
- Daily availability, ordered work, missed-session recovery, explicit optional-work deferral, honest overflow.
- Focus timer, completion logging, undo, workspace backups and calendar export.
- Open-page notifications and downloadable calendar reminders.

## Deliberate limits
This is a deterministic prototype, not a semantic AI tutor. Extracted notes and questions need review. Scanned PDFs need OCR elsewhere; mathematical notation, diagrams and complex layouts are not reliably interpreted. No cloud sync, accounts or server push. Device-local data can be lost if browser storage is cleared; use backups. Quiz coverage is not predicted exam performance. Daily time budgets are not calendar conflict detection. Course projects are planned independently, so availability is not shared across multiple projects yet.

## Architecture
Vanilla ES modules with no frontend framework. `planner.js` is a pure capacity-constrained sequential scheduler. `learning.js` extracts source-grounded drafts and computes practice metrics. `campus.js` manages courses and practice. `app.js` manages the study desk and project library. PDF.js is the sole production package and is copied into the static build. No secret API keys are required.

Dates are local calendar dates; study plans include the due date. Sessions are at most 50 minutes. Work is never allocated above a date's declared minutes. Required tasks cannot be omitted via the optional-work control. The engine does not infer rest time or academic importance.

## Deployment
GitHub Actions runs tests, builds and deploys `dist/` to GitHub Pages. Enable Pages with GitHub Actions as its source. `vercel.json` also supports static deployment through Vercel.

For local development after a clean clone, `pnpm build` creates the vendored PDF assets used by `pnpm dev` (the server serves `dist/` vendor paths if source vendor files are absent).

## Product evidence
- [Research and validation plan](docs/RESEARCH.md)
- [Judging rubric and three-minute demo](docs/HACKATHON.md)

The work is a testable hypothesis, not a claim of product-market fit. No student interviews or paid validation have been fabricated.
