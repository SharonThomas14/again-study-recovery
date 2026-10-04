# ReStride: product and validation memo
Research date: 3 October 2026. Decision: build a small, testable prototype; do not claim product-market fit or invest in a full platform yet.

## Recommendation
An assignment recovery coach for university students with variable schedules. The entry point is the moment a plan breaks: “I missed yesterday. I have 20 minutes today.” ReStride turns remaining work and explicitly declared availability into a revised sequence, exposes unscheduled minutes, and lets the student approve scope changes. A missed session is information, not a broken streak.

The differentiation hypothesis is **fast, understandable recovery with student-controlled trade-offs at assignment level**. Automatic rescheduling, task decomposition, and workload warnings already exist. This is a workflow and positioning bet, not a claim of unique technology.

## Evidence and its limits
- HEPI / Advance HE's 2026 Student Academic Experience Survey surveyed 10,065 UK full-time undergraduates. 65% reported term-time paid employment; independent study averaged 11.1 hours weekly. Employed students' combined commitments averaged 44.2 hours. This supports studying around constrained time. It does not establish demand for ReStride or generalise directly to Australia. [Primary report summary](https://www.hepi.ac.uk/reports/the-student-academic-experience-survey-2026/)
- A meta-analysis reports a moderate association between time management and academic achievement (overall r=.262 across 76 samples; substantial heterogeneity). This is not evidence that an app causes higher grades. [Aeon et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7799745/)
- Australian QILT survey materials explicitly measure paid work, caring, workload, and study/life balance. These are credible local interview dimensions, not a quantified Australian demand estimate. [QILT Student Experience Survey](https://www.qilt.edu.au/surveys/student-experience-survey-%28ses%29)
- Public community discussions describe trouble allocating large assignments and abandoning overloaded plans. Such posts are self-selected, sometimes promotional, and are only qualitative leads. Do not count them as independent validation. [Example discussion](https://www.reddit.com/r/productivity/comments/1c99c09/what_is_the_best_ai_scheduler_for_allocating_time/)

## Competitive reality
| Alternative | Verified offer | Implication for ReStride |
|---|---|---|
| Motion | Reschedules tasks using priorities, deadlines, availability; warns on risk and unschedulable work | Rescheduling and feasibility warnings are not unique. |
| Shovel | Student-specific time blocking, syllabus/LMS import, workload-versus-time Cushion | Closest competitor; avoid competing first on full-semester integrations. |
| Reclaim | Calendar optimisation, rescheduling, priorities, AI planning; student discount | Strong general-purpose substitute. Natural language is not a moat. |
| Sunsama | Daily planning, workload checks, deferral, incomplete-task rollover | Calm tone and realistic planning alone are not unique. |
| Goblin Tools | Task breakdown, estimation, actionable lists | Breaking down an assignment alone is insufficient differentiation. |
| Calendar, paper, ChatGPT | Familiar, flexible substitutes with low switching cost | ReStride must beat a short chat plus manual calendar edits. |

Sources: [Motion](https://www.usemotion.com/help/time-management/auto-scheduling/reference-auto-scheduling/how-auto-scheduling-works-behind-the-scenes), [Shovel](https://shovelapp.io/), [Shovel schedule setup](https://help.shovelapp.io/en/calendar/create-your-schedule), [Reclaim](https://reclaim.ai/pricing), [Sunsama](https://help.sunsama.com/docs/usage-guides/daily-planning/), [Goblin Tools](https://goblin.tools/).

Shovel's pricing page currently displays $9.79/month and $39/year promotional offers, while another purchase page contains different prices. Treat these as a snapshot, verify currency and checkout before using in a pitch. Reclaim lists a free tier and student discounts. Both constrain willingness to pay. [Shovel pricing](https://shovelapp.io/pricing/)

## Ideation funnel
Scores below are product judgment, not measured customer results. 5 is best; ease means easiest to validate/build.
| Concept | Pain urgency | Differentiation potential | Ease | Decision |
|---|---:|---:|---:|---|
| Universal AI student planner | 3 | 1 | 2 | Reject broad crowded entry point |
| More reminders / streaks | 2 | 1 | 5 | Reject; misses recovery moment |
| Automatic syllabus importer | 3 | 2 | 2 | Later; integrations and extraction burden |
| Grade optimiser | 4 | 3 | 1 | Reject first; unreliable grade assumptions |
| Assignment recovery with explicit trade-offs | 5 | 4 | 5 | Build and test |
| Shift-aware semester scheduler | 4 | 3 | 2 | Candidate expansion after recovery retention |
| Study buddy accountability | 3 | 2 | 3 | Needs social coordination, weak initial wedge |
| University early-warning dashboard | 4 | 3 | 1 | Later; procurement and privacy friction |
| Energy-aware microtasks | 4 | 3 | 4 | Useful later; avoid inferring health or ability |
| Extension-request assistant | 4 | 2 | 4 | A possible overflow action; never promise eligibility |
| Rubric-aware recovery | 5 | 4 | 2 | Strong next experiment; require student confirmation of rubric and dependencies |
| Assignment rescue service run by humans | 5 | 3 | 4 | Useful concierge pilot before further automation |

## Focused product
Job: When life interrupts an assignment plan, help me choose the next achievable step and understand what that means for the deadline, without rebuilding my entire calendar.

First user: student with an assignment due in 3–14 days, at least one missed session, and a work/caring schedule that changes. Recruit based on circumstances, not diagnoses.

MVP:
1. Goal, due date, editable work steps and estimates, actual availability by date.
2. Missed work remains unfinished; it is not silently marked complete or counted twice.
3. Recovery recalculates from today, respects declared capacity, and preserves ordered prerequisites.
4. Preview moved work, remaining spare minutes, and work that does not fit.
5. Keep all work, or explicitly defer named optional steps; never silently remove required work.
6. Accept the revision; focus on one session; log completion; undo; export calendar/backup.

No grade guarantees, forced overtime, medical inference, fabricated testimonials, fake AI, or invented users. This prototype uses a deterministic planner. Templates and estimates are editable starting points, not an LLM's assessment of a real course rubric. Data is explicitly saved only in this browser; no account or cloud sync is implied.

## Why this could be worth a small investment
The trigger is concrete, recurring, and emotionally salient. A working demo can communicate the benefit in 30 seconds, and a small deterministic engine can validate the interaction before expensive AI or LMS integration. The main risks are episodic use, inaccurate estimates, setup friction, low student willingness to pay, and incumbents copying the flow. The defensibility, if any, would come later from trusted assignment workflows, distribution, and demonstrably better recovery outcomes—not the scheduling algorithm.

## Validation: proposed, not completed
No student interviews, pilot participants, purchases, or retention measurements have been collected. Desk research validates plausibility of the problem; it cannot validate the product.

### Stage 1: 12 problem interviews
Recruit 12 students, with at least 8 balancing paid work or caring. Ask about the most recent missed session, observe their current recovery process, and ask what they dropped. Do not pitch until after behaviour questions. Gate: at least 8 describe a recent concrete interruption, and at least 6 show a cumbersome workaround. If not, narrow or change the segment.

### Stage 2: 8 observed usability sessions
Use participants' own assignments with consent. Compare ReStride against their normal method using alternating order. Tasks: enter work, lose a session, reduce today to 20 minutes, explain the trade-off, and choose scope when infeasible. Gate: 6/8 independently recover in under 60 seconds after setup; 7/8 correctly explain the consequence; no silent overscheduling or mistaken removal of required work. These are proposed thresholds, not statistically powered estimates.

### Stage 3: two-week, 20-student concierge pilot
Primary outcome: accepted recovery followed by a self-reported completed session within 24 hours. Secondary: time to recovery, repeat recovery use, setup abandonment, estimation error, and whether the user understood dropped scope. Gate: 12 activate, 8 use a second recovery, and at least 60% of accepted recoveries lead to a completed session. Record uncertainty and interview non-returners.

### Stage 4: willingness to pay
After demonstrated usefulness, test a clearly labelled A$15 semester pass versus free limited use. Seek explicit opt-in or actual purchases only when billing and refund terms exist. Do not treat “I'd pay” as revenue. A campus learning-support pilot is a separate channel hypothesis, not a shortcut to institutional demand.

Stop or pivot if students prefer a short ChatGPT prompt, setup outweighs benefit, or the explicit trade-off is not valued. Potential pivot: assignment recovery widget in an existing campus workflow, rather than a standalone planner.

## Distribution and economics
Start with opt-in demos through student societies and learning-support staff. Do not scrape or send unsolicited outreach. Test one assignment with no account required. With 1,000 hypothetical paying users at A$15/semester, gross revenue would be A$15,000/semester before costs; this is scenario arithmetic, not a market-size forecast. Avoid an unsupported TAM. Measure acquisition and support costs before extrapolating.

## Design direction
An editorial study desk: warm off-white canvas, ink typography, restrained vermilion, thin rules, large readable numbers, a distinctive looping route mark. Take inspiration from typographic editorial work, not a clone of another product. [Awwwards typography/editorial reference](https://assets.awwwards.com/assets/files/live-presentation.pdf), [Ordinary People](https://ordinarypeople.info/). The interface should feel forgiving while making consequences precise. Accessibility, keyboard navigation, reduced motion, and narrow-screen layouts are requirements.

## Hackathon narrative
Problem → missed session → 20-minute reality → feasible next action → visible trade-off → explicit choice when impossible. Show the actual engine responding to different capacities, not a fixed scripted answer. Explain that user validation remains the next milestone. Hackathon rules, permitted technologies, submission deadline and judging rubric were not supplied; compliance cannot yet be claimed.

## Expanded learning scope after judging-criteria review
The requested product now includes courses, material ingestion, study notes, practice, goals, progress and reminders. This is functionality required for the hackathon, not evidence that a broad platform is the best initial commercial strategy.

The additional competitor search found especially strong overlap with **RemNote**: its exam scheduler, flashcard priorities, progress view and catch-up periods already connect learning and scheduling. [Exam preparation](https://help.remnote.com/en/articles/9101991-preparing-for-an-exam), [Flashcard home and catch-up periods](https://help.remnote.com/en/articles/7925835-the-flashcard-home), [Exam study plan](https://help.remnote.com/en/articles/16081995-exam-study-plan). StudySmarter also offers document-based flashcards and quizzes. [StudySmarter flashcards](https://www.studysmarter.co.uk/features/flashcards/).

Therefore do not pitch “learning + planning” or “catch-up” as unique. Test whether ReStride's specific presentation of task-level scope loss, capacity and explicit optional-work decisions is clearer and faster for the chosen segment.

Retrieval practice has an established research basis, and feedback helps correct errors. That supports the practice interaction, not a claim that our specific generated questions improve results. Our cloze questions measure limited recall and do not establish transfer or higher-order mastery. [Researcher-led retrieval practice guide](https://www.retrievalpractice.org/summary).
