# Assignment Studio AI engines

## Free local AI (default, including GitHub Pages)

Open Assignment Studio → AI engine → Download & start local AI. A pinned Qwen2.5-0.5B-Instruct Q4 model (~400 MB) downloads from Hugging Face and runs in the browser through Wllama 2.3.7 single-thread CPU WebAssembly. The weights are cached by the browser, not committed to Git. No provider account, paid backend, API key, WebGPU or cross-origin isolation is required. A new browser/site origin needs its own cache and sufficient free storage/memory. Loading or generation can fail on low-memory devices; existing work is retained.

Local prompts include the first 2,200 brief characters, 1,200 rubric characters and 1,800 note characters. Mentor uses the recent question; local report/slide outputs are short working drafts. These explicit limits keep context within 4,096 tokens. Plan and slide output is parsed and validated before it reaches editable proposals. Local planning generates a concise action list; each task starts with a visibly disclosed 30-minute placeholder budget and a generic self-check. Detailed rubric mappings and richer outputs require the optional cloud mode or student editing. The model is small and may hallucinate, omit criteria or misjudge durations. The student must review each output, check rubric coverage and verify every claim. Course quiz/flashcard extraction remains deterministic.

GitHub Pages cannot execute the optional server functions below. Local AI does not need them. The browser still requests model/runtime assets; assignment prompts stay on the device in local mode. Resource searches send search terms to Crossref or the chosen search website.

Model: https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF (pinned revision in src/local-ai.js). Runtime: https://github.com/ngxson/wllama.

## Vercel

Import `SharonThomas14/again-study-recovery` into a Vercel project. Framework: Other. Build: `node build.mjs`. Output: `dist`. Install: `pnpm install --frozen-lockfile --ignore-scripts`. The `api/` directory contains Vercel Node functions.

Set environment variables in Vercel, never in source code:

- `OPENAI_API_KEY` **or** `GEMINI_API_KEY` (OpenAI takes precedence if both exist).
- `AI_MODEL`: a JSON-output-capable model available in that account.
- `AGAIN_ACCESS_TOKEN`: a long random private workspace code, separate from the provider API key.
- Optional `GOOGLE_CLIENT_ID`: Google OAuth web client ID.

Redeploy after changing environment variables. Enter the workspace code through Assignment Studio → AI settings. It stays only in memory. Never enter a provider key into the website. A provider account with API access/billing is distinct from a consumer chatbot subscription.

For local use, copy `.env.example` to `.env`, fill it privately, build, then run `node --env-file=.env server.mjs`.

## Google Calendar

Enable Calendar API in a Google Cloud project. Create a web OAuth client, register the exact deployed site origin, configure the consent screen and add test users while in testing. The UI requests `calendar.events.freebusy` and reads the primary calendar. It does not write calendar events or persist OAuth tokens. Other calendars can be supplied through .ics import. For a public launch, complete Google's required verification as applicable.

## Pilot security and limitations

The shared workspace code is suitable for a trusted owner/pilot only, not public multi-tenant SaaS. Before a public AI launch add individual authentication, durable per-user quotas/rate limiting, usage monitoring, deletion policy, consent review and billing limits. Request size and model output are bounded; malformed results cannot replace a plan. Provider errors and unavailable credentials remain visible. Source documents are untrusted input; model output is escaped as text.

AI requests send the current assignment brief, rubric, student notes, steps, discovered source metadata and up to 12 recent conversation messages to the configured provider. No calendar event descriptions or account tokens are included. Workspace persistence and JSON backups are local and unencrypted. Do not put private keys or sensitive student data in the public repository.

## Verification still needed after credentials

Run a real assignment and a syllabus end to end on the deployed API. Check rubric coverage, estimate plausibility, citation support, mentor context isolation and failed requests. Connect a test Google account and compare busy intervals with known events. Check actual Word/Overleaf/Canva/Google Slides import fidelity. No paid model call or OAuth success is claimed before these checks.
