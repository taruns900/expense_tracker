# Development agent instructions

Follow this document on every implement, update, and fix. Product and architecture truth live in `Docs/PRD.md` and `Docs/PLAN.md`. Code must stay aligned with those docs. When a project decision changes, update those docs in the same task. Do not invent product behavior that is not in the PRD or the current plan phase.

## Required context (always)

Before writing or deleting code:

1. Read the relevant sections of `Docs/PRD.md` (product rules, fields, UX, non-goals).
2. Read the relevant sections of `Docs/PLAN.md` (architecture, repo layout, current phase, definition of done).
3. Inspect the existing implementation in `apps/mobile`, `apps/api`, and `packages/shared` so the change fits current patterns.
4. If the PRD and PLAN disagree, follow the PRD for product behavior and the PLAN for how to build it. Then update the lagging doc in the same task so they agree again. Do not silently pick a third design.

V1 is a mobile-only, offline-first, cloud-backed expense tracker (React Native + Expo, NestJS on **Render**, **Neon PostgreSQL**, local SQLite, sync of **records** only). **Receipt attachments (photos/PDFs) are V2** — keep schema and commented code in repo; do not enable attachment UI or upload routes in V1. Do not add V1-out-of-scope work from PLAN section 2 (web app, RBAC, approvals, GST filing APIs, multi-company, microservices, realtime collaboration, forecasting, AI insights, cloud object storage for receipts) unless the user explicitly asks. Optional AI on payment history is PLAN section 16 / PRD section 72 — post-V1 only. Local receipt attachments are PLAN section 17 / PRD sections 21–24 — V2 only.

## Rule 1 — Do not disturb running functionality

- Change only what the task requires. Prefer the smallest safe diff.
- Reuse existing screens, services, repositories, stores, and shared packages. Do not rewrite a working path to “clean it up” unless that is the task.
- Preserve public contracts: navigation routes, SQLite schema/migrations, API routes and payloads, shared types in `packages/shared`, and user-facing copy unless the PRD/PLAN or the task requires a change.
- Do not break offline-first behavior: UI reads/writes local SQLite and local files first; sync stays in the background.
- After the change, mentally walk (and when possible run) the flows that share the same state, schema, or components. A local win that regresses dashboard, expense list, add/edit, master data, lock, or sync is a failed change.
- If a refactor is needed, keep behavior identical and list the preserved flows in the summary.
- Never leave a file in a half-edited state that Babel/Metro cannot parse. Syntax errors in the running app are the agent's to catch and fix in the same task.

## Rule 2 — Do not drop features in the next update

- Every existing user-visible feature and every already-implemented PLAN deliverable must still work after the change.
- When adding or changing a feature, keep related surfaces consistent (same data model, filters, empty states, error handling, and navigation).
- Do not stub, hide, or delete a screen, field, or service “for later” if it already exists.
- If the task is a partial slice, implement the slice fully enough that existing features remain complete; do not leave broken links or half-migrated call sites.
- New work must not make previously shipped PRD requirements optional or unreachable.

## Rule 3 — Remove extra or unused code safely

On each task, scan the touched area and, when the task is a broader cleanup, the whole repo for:

- Dead files, unused exports, unused dependencies, commented-out blocks, leftover placeholders, duplicate barrels, and experiments that are not on the PLAN layout.
- Code that is never imported, never routed, or superseded by a later implementation.

Remove only when all of these are true:

- Nothing in `apps/`, `packages/`, or tests still imports or routes to it.
- It is not a required PLAN/PRD artifact (for example a migration that already shipped).
- Removing it cannot change runtime behavior.

Never delete: `Docs/`, `.env*` / secrets, migrations already applied, generated lockfiles unless you are intentionally changing dependencies, and files required by Expo/Nest/Prisma tooling.

If unsure whether something is dead, leave it and say so. Do not “clean up” by guessing.

## Rule 4 — No duplicate implementations

There must be one implementation of each concern:

| Concern | Canonical location |
| --- | --- |
| Shared enums, GST helpers, human-readable expense IDs, defaults | `packages/shared` |
| SQLite access | `apps/mobile/src/database` (migrations + repositories) |
| Domain writes/reads for the UI | feature `*Service` modules, not ad-hoc SQL in screens |
| HTTP / auth / sync / attachments / PDF / export | `apps/mobile/src/services/*` |
| UI primitives and theme | `apps/mobile/src/components` |
| Types used by multiple features | `apps/mobile/src/types` or `packages/shared` |
| API modules, Prisma, auth | `apps/api` |

Do not:

- Copy a helper into a second file instead of importing the existing one.
- Add a second repository, store, or API client for the same entity.
- Reimplement money, dates, IDs, GST, or validation that already exists.
- Duplicate screen logic that already lives in a shared component (for example a second expense form).

If you find two implementations, keep the one that matches PLAN layout and PRD behavior, migrate callers, then delete the other in the same change.

## Rule 5 — Docs-first, then code

Every task:

1. Identify the PRD requirement and PLAN phase/section the task belongs to.
2. Implement to that spec, using existing repo layout (`apps/mobile`, `apps/api`, `packages/shared`).
3. Do not expand scope beyond the asked task and the current phase.
4. If the codebase and docs have drifted, and the user has **not** changed a decision, update code to match the docs.

Do not treat comments, old TODOs, or similar apps as product spec. Spec is `Docs/`.

## Rule 6 — Decision changes must update the docs

If the user changes any project decision (product, UX, architecture, stack, data model, API, sync, security, phases, scope, non-goals, definition of done, or repo layout), **update the documents in the same task** before or with the code. Do not leave the old decision in the docs and implement the new one only in code.

Apply the change here:

| Kind of decision | Update |
| --- | --- |
| Product behavior, fields, UX, users, principles, V1 vs later | `Docs/PRD.md` |
| Architecture, repo layout, phases, API surface, sync, testing, DoD, build sequence | `Docs/PLAN.md` |
| Both (most stack, scope, and domain-model changes) | Both files, so they stay consistent |

How to update:

1. Restate the new decision in one sentence.
2. Patch every section that still states the old decision (tables, outcomes, non-goals, architecture, phases, checklists). Do not leave contradictions.
3. Keep PLAN pointing at PRD for product rules; keep PRD as product truth and PLAN as how to build it.
4. Then implement or adjust code to match the **updated** docs, still following Rules 1–4.
5. In the change summary, name which doc sections changed and what the old vs new decision was.

Treat these as decision changes even if the user does not say “update the docs”: “we will use X instead of Y”, “drop this from V1”, “add this to V1”, “change the API / schema / navigation”, “offline works differently”, “new phase order”.

Do not rewrite unrelated chapters. Do not invent extra product changes. If the user only asks for a code fix and does not change a decision, do not edit `Docs/`.

## Rule 7 — Confirm the running server after every change

After any implement, update, or fix, the task is not done until the app still **runs**. Typecheck alone is not enough if a bundler is serving the app.

1. Run `npm run typecheck` from the repo root after code changes in `apps/` or `packages/`.
2. If Expo/Metro or the API is already running (check the session terminals), read the **latest** output after the edit. Wait for a rebuild if one is in progress.
3. Treat these as failures that must be fixed in the same task: `SyntaxError`, Babel parse errors, Metro transform crashes, bundler “Unable to resolve”, NestJS failed to start, or a process that exited because of the change.
4. If the server was healthy before the change and is now erroring, fix the syntax or import first; do not report the feature complete.
5. If no server is running, still typecheck. Start or restart `npm start` (mobile) and/or the API only when needed to confirm the change bundles, or when the previous server died because of the edit.
6. In the summary, say whether the running server was checked and whether it stayed healthy.

## Implementation workflow

1. **Scope** — Restate the task in one sentence and name the PRD/PLAN sections that apply. If the user changed a decision, update those sections first.
2. **Inventory** — Find existing files that already do this job. Plan reuse first.
3. **Implement** — Smallest change that satisfies the spec. Match local naming, imports, and UI patterns (no emojis in the UI; use the existing design system).
4. **Deduplicate and prune** — After the change, remove the duplicate or dead code you can prove is unused.
5. **Regression check** — Confirm related screens, repositories, and API handlers still compose. Run `npm run typecheck` from the repo root. Then follow Rule 7: confirm the running Expo/Metro (and API if used) server is still healthy. For UI changes, verify the user flow, not only a screenshot.
6. **Stop** — Do not add extra features, drive-by refactors, or unrelated files.

## What not to do

- Do not add a new package, app, or architectural layer unless PLAN requires it.
- Do not introduce a second state library, database, or HTTP stack.
- Do not change auth, sync, or schema casually; those are cross-cutting (PLAN sections 6, 10, 12).
- Do not leave parallel “old” and “new” implementations.
- Do not implement a new decision in code while leaving `Docs/PRD.md` or `Docs/PLAN.md` on the old decision.
- Do not edit `Docs/` when the user did not change a project decision.

## Done when

- The requested change matches PRD + PLAN.
- If a project decision changed, `Docs/PRD.md` and/or `Docs/PLAN.md` state the new decision with no leftover contradictions.
- Existing features and running flows still work.
- There is a single implementation of the changed concern.
- No new dead code was added; proven-dead code in the touched area was removed.
- Verification appropriate to the change was done (typecheck, tests, or UI flow).
- The running Expo/Metro (and API if it was up) process is still healthy after the change, or any syntax/bundler failure was fixed in the same task.