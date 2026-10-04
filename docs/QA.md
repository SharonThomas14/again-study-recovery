# Verification update — 4 October 2026

## Current release
- Rebranded to **ReStrive** with the owner's latest supplied PNG logo; legacy storage keys and repository URL retained for compatibility.
- 38 automated tests pass, covering baseline planning plus calendar recurrence/overlaps/timezones, numeric dates, AI output validation and Office exports.
- Real downloaded Qwen 0.5B loaded and generated a mentor response in the browser. It is small, slow on CPU and can invent facts. Multiple structured-plan prompts failed format compliance; local planning was simplified to a concise action list with explicit placeholder time budgets. Do not describe this as validated high-quality tutoring.
- Simplified local planner successfully generated four assignment-specific actions from the solar-panel/green-roof brief. Editing a time estimate, adding a drafting/review mission and applying the proposal were verified in the browser. This is one technical test, not evidence of general planning quality.
- New graphite/cloud UI inspected on desktop and at 390×844 CSS pixels. Document width remained 390 pixels; timeline/calendar/nav use their own horizontal scroll. Fixed legacy timeline contrast after visual inspection.
- Profile settings, light/dark and larger reading text checked; manual calendar event creation and day/week/month controls checked.
- Browser sample PDF extraction passed with the compatibility build. A synthetic 100-page text PDF extracted all 100 pages through the built reader in Node; no browser rendering capability is inferred from Node warnings about canvas. User's actual failing PDF was not available.
- DOCX/PPTX generation checked by automated ZIP signatures; browser export handlers reached ready state. Actual Word/Canva import fidelity remains unverified.
- PDF upload limits are 50 MB / 500 pages / 1.5M text characters; topic extraction is capped at 60 topics per import and now discloses this cap. Scans still need OCR.

## Integration limits
Google OAuth needs an owner-configured client ID; no successful Google connection is claimed. Canvas/Apple/Outlook files are imported snapshots, not live sync. RMIT Val is a handoff link and copied context, not an API integration. Cloud AI has a fail-closed Vercel handler but provider credentials have not been supplied. Local AI runs without them. Multi-project capacity is still independent. Real student demand and willingness to pay are untested.

## Earlier verification record (before this release)

### Verification record — 3 October 2026

## Automated checks
27 Node tests pass, including 500 deterministic varied scheduling scenarios.

Covered: work conservation, capacity bounds, dependency order, deadline boundaries, zero availability, partial completion, optional-only omission, natural-language minute extraction, daylight-saving date arithmetic, backup validation, source attribution, no invented quiz evidence, unique-card coverage, latest-attempt scoring and separation of self-rated flashcards from quiz results.

## Browser checks performed
- Desktop initial render, navigation and modal controls.
- Sample course creates four topics and twenty source-derived cards.
- Correct quiz answer shows supporting source and changes quiz evidence to 1/20 (5%).
- Flashcard reveal, self-rating and next-card progression.
- Real sample PDF parsed through the browser PDF.js path: one page, one topic, three cards.
- Pasted text creates a titled topic and three practice cards.
- Topic-to-plan creates a course-specific project and retains the previous assignment.
- Project switching retains assignment details.
- Recovery at 20 minutes produces 300 required / 285 available / 15 unscheduled minutes.
- Explicitly deferring the optional 35-minute task gives 265 required / 285 available / 20 spare minutes.
- Recovery preview reports a one-day calendar buffer reduction.
- Accepting recovery persists its schedule.
- Focus timer starts; logging 20 minutes reduces unfinished work and today's remaining availability.
- Published GitHub Pages root returns HTTP 200 and the app renders.

## Verification limits
The browser automation extension blocked its file chooser from supplying local files without the user's extension file-access setting. The same PDF extraction path was verified using the app's public sample-PDF loader; automated arbitrary local-file selection was not verified. Native users can choose files using the standard input.

Responsive styles are implemented. The browser viewport override did not change the observed viewport on this host, so a true narrow-device browser run is not claimed here. Desktop visual inspection was performed.

Notification permission was not granted merely for testing. Reminder calendar export uses a standard VEVENT/VALARM structure; delivery depends on importing it into a calendar and that calendar's settings. Screen-reader and end-user usability testing remain future work.

## Product limits affecting interpretation
Device-local persistence, no semantic AI generation or OCR, exact-term cloze grading, limited recall evidence rather than exam predictions, and independent per-project budgets. Real student desirability and willingness to pay remain untested.

## Assignment Studio extension — 3 October 2026

34 automated tests pass, including calendar overlaps/recurrence/all-day events, output validation, fail-closed AI configuration and ZIP-based Office file generation. Browser checked studio navigation, text persistence, missing-provider error, report export generation and slide export generation. The browser check found and fixed the PPTX global constructor name. The browser download observer did not return a file path; no successful downstream Word/Canva import is claimed. Live model generation and Google consent/freebusy remain untested without owner credentials. See AI-SETUP.md.
