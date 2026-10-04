# Verification record — 3 October 2026

## 4 October 2026 addendum
An isolated browser test uploaded a generated 500-page PDF through the file chooser. The course showed all 500 pages and 60 sampled practice topics; opening the material displayed extracted source text. Removing it deleted the course material and those 60 topics, returning the course to its previous counts. The upload and removal test used a separate local origin so existing app data was untouched.

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
The original 3 October browser check could not supply local files through its file chooser. The 4 October addendum above verifies that flow with a generated local PDF.

Responsive styles are implemented. The browser viewport override did not change the observed viewport on this host, so a true narrow-device browser run is not claimed here. Desktop visual inspection was performed.

Notification permission was not granted merely for testing. Reminder calendar export uses a standard VEVENT/VALARM structure; delivery depends on importing it into a calendar and that calendar's settings. Screen-reader and end-user usability testing remain future work.

## Product limits affecting interpretation
Device-local persistence, no semantic AI generation or OCR, exact-term cloze grading, limited recall evidence rather than exam predictions, and independent per-project budgets. Real student desirability and willingness to pay remain untested.
