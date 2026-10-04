# ReStride — hackathon demonstration and judging evidence

## The one-sentence pitch
ReStride turns course material into small learning steps, then helps students recover when life interrupts—with visible consequences and choices they control.

## Judging rubric mapping
| Criterion supplied by the team | Demonstrable evidence | What still needs external validation |
|---|---|---|
| Problem relevance | Student time-pressure research; a concrete missed-session scenario; realistic availability including zero-time days | Interviews with intended students, particularly the local cohort |
| Desirability & impact | One-step recovery, visible sources, no account requirement, local data, goal and practice tracking | Repeat usage, recovery-to-completion rate, willingness to pay; no invented traction |
| Solution & creativity | Connect material → practice gaps → study tasks → interruption recovery → explicit scope choices | Head-to-head comparison with RemNote, Shovel, Motion and existing student workflows |
| UI/UX | Editorial typography and restrained colour, mobile layout, labelled controls, native modal focus management, explanatory states | Observed usability sessions and broader assistive-technology audit |
| Functionality | Courses/projects; PDF/TXT/Markdown or paste; topic excerpts; cloze quizzes and flashcards; evidence dashboard; task deadlines/goals; capacity-aware recovery; focus timer; local persistence; backups; calendar exports and reminders | Cloud accounts, semantic AI generation, OCR and server push notifications are outside this prototype |
| Presentation | Three-minute script below; sample course and real sample PDF; deliberately infeasible scenario that demonstrates the core logic | Confirm official time limit, hackathon submission format and permitted dependencies |

## Three-minute live demo
**0:00–0:25 — the real problem.** “You had a study plan. Then a shift ran late. Now you have twenty minutes. Another reminder does not tell you what to sacrifice.” Reference the HEPI survey accurately as UK evidence. Do not imply every student has this experience.

**0:25–0:55 — material becomes active practice.** Open Courses & materials. Create a course or explore the labelled sample. Add materials → our sample PDF demonstrates actual PDF parsing. Open a topic's source-linked study notes. Show the original text. Explain that the current extraction is deterministic and produces editable study drafts, not a hidden AI model.

**0:55–1:20 — check what you remember.** Run a quiz, answer a question, and show corrective source text. Open Learning progress. Explain the denominator: distinct source-derived cards answered correctly on their latest quiz attempt. It is not an exam-grade prediction. Flashcard self-ratings do not inflate that metric.

**1:20–1:45 — turn learning into a plan.** From the course library choose “Turn topics into a study plan.” Show the course-specific project, goal, deadline and editable estimates. Set actual availability. The default 45-minute budgets are starting assumptions to replace, not inferred free time.

**1:45–2:30 — the differentiating moment.** Switch to the example assignment via project library, or reload the example from About. Choose 20 minutes and “Find my way forward.” The demo has 300 minutes of work but only 285 remaining minutes, leaving 15 unscheduled. Show precisely what moves. Defer the explicitly optional 35-minute case study; now 265 minutes fit with 20 spare. Required work is never silently deleted. Accept and show the new timeline.

**2:30–2:45 — guide, don't ghostwrite.** Show “Unpack my assignment” with a brief. It identifies command verbs and gives process questions. It does not generate the student's argument or submission.

**2:45–3:00 — impact and honest next milestone.** “Our hypothesis is that transparent recovery makes it easier to resume. Next we test time-to-recovery, comprehension of trade-offs and completed study sessions with real students.” End on the next small step.

## Demo preparation
- Use the labelled sample data; do not imply it belongs to a participant.
- The sample course contains 4 topics and 20 cards. The PDF sample adds another topic.
- Export a workspace backup before resetting. Loading the assignment example should not delete learning materials.
- Keep a local preview available as a network fallback. GitHub Pages uses the same static output.
- Browser notifications require the student's explicit browser permission and an open page. Calendar reminders work after import into a calendar, subject to its notification settings.
- Native PDF upload may require a browser automation extension's file-access setting for automated QA; normal user file selection is not governed by that extension.

## What not to claim
No proof of improved grades, product-market fit, paid users, learner interviews, clinical benefit, market exclusivity, AI semantic understanding, reliable background push or OCR. The broad feature set overlaps established products. The proposed advantage is a coherent recovery interaction and user-controlled trade-offs.

## Open rule questions
The judging criteria are now known. The hackathon name/link, submission deadline, team eligibility, build-period rules, required sponsors/technologies and presentation time limit were not provided. This artifact addresses the supplied rubric but cannot certify those other rules.
