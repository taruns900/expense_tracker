# Expense Tracker — Implementation Plan


| Field         | Value                                                       |
| ------------- | ----------------------------------------------------------- |
| Related PRD   | [PRD.md](./PRD.md)                                          |
| Version       | V1.0                                                        |
| Status        | Implementation Plan                                         |
| Product       | Offline-first, cloud-backed, mobile-only expense management |
| Primary users | Individual owners (one cloud dataset per login; shared business later) |
| Mobile        | React Native + Expo + TypeScript                            |
| Backend       | NestJS + Prisma + REST                                      |
| Cloud         | Render (NestJS) + Neon PostgreSQL; attachments in V2        |


This plan turns the Product Requirements Document into a build sequence. It is the working document for architecture, repository layout, phase deliverables, and definition of done. Product rules, UX copy, and field lists remain in the PRD.

---



## 1. Purpose

Build a mobile expense app that:

- Records an expense in a few seconds using **date, category, amount, and payment method**.
- Works fully **offline** against local SQLite and local files.
- Syncs automatically to **NestJS on Render → Neon PostgreSQL** when the network is available. Receipt attachments are **V2** (not V1).
- Gives owners a dashboard for today / week / month / year, charts, and top categories. Full expense history is under More.
- Exports **individual expense PDFs** and **filtered report PDFs** on device.
- Stays simple enough for one signed-in owner per cloud dataset (login on launch), while leaving room for later shared-business access, billing modules, a web client, and optional AI insights on payment history.

---



## 2. Outcomes and non-goals



### V1 outcomes

- Fast expense entry with all expense fields on one add popup (optional fields left blank). **Vendor picker is deferred.**
- Categories and subcategories as user-managed master data (not hard-coded). **Vendors deferred.**
- Production API on **Render**; **Neon** PostgreSQL for cloud records **per `userId`**.
- Human-readable expense ID `DDMMYY-HHMMSS` plus internal UUID (unique per user in the cloud).
- JWT auth required on launch (phone + password); refresh token 30 days; optional in-app PIN; optional Face / fingerprint unlock toggles in Settings.
- No emojis in the UI; consistent icon set and design system.



### Explicitly out of V1

Web app, RBAC, approvals, employees, accountant role, GST filing / government GST APIs, multi-company, microservices, realtime collaboration, advanced financial forecasting, AI-generated insights or suggestions, **expense receipt attachments (photos/PDFs)**, and **cloud object storage for receipt files**.

V1 dashboard metrics stay deterministic (SQLite totals, charts, top categories, month-over-month). AI on payment history is **optional later work**, not a V1 deliverable (see section 16).

---



## 3. Architecture

```text
                         MOBILE APPLICATION
                                 │
                  React Native + Expo + TypeScript
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
          UI / UX                              Local Data
              │                                     │
              │                                  SQLite
              │                                     │
              │                              Local Files
              │                                     │
              └──────────────────┬──────────────────┘
                                 │
                           Sync Engine
                                 │
                           HTTPS / REST
                                 │
                                 ▼
                         NestJS Backend (Render)
                                 │
                                 ▼
                           Neon PostgreSQL

              Receipt files: V2 (on-device; not in V1 MVP)
```



### Sources of truth


| Context                                      | Source of truth        |
| -------------------------------------------- | ---------------------- |
| On-device UI reads and writes                | SQLite + local files   |
| Long-term persistence of records, second device | Neon via the API |
| Receipt photos and PDFs                         | **V2** — local files on device when enabled |


The mobile app never talks to Neon directly.

### Core data path

1. User action updates SQLite immediately; the UI re-renders from local data.
2. A `sync_queue` row is written (`PENDING`).
3. When online, the sync engine posts changes to NestJS.
4. NestJS on Render validates and persists records to Neon PostgreSQL **under the JWT `sub` (`userId`)**. No attachment files in V1. Vendor and business-profile sync are deferred.
5. Local rows move `PENDING → SYNCING → SYNCED` (or `FAILED` with automatic retry).

---



## 4. Recommended repository layout

Keep mobile and API in one repo so shared types and Zod/Prisma contracts stay aligned.

```text
expense_tracker/
├── README.md
├── Docs/
│   ├── PRD.md
│   └── PLAN.md
├── apps/
│   ├── mobile/                 # Expo app
│   └── api/                    # NestJS
└── packages/
    └── shared/                 # Shared TypeScript types / enums / ID helpers (optional)
```



### Mobile (`apps/mobile`)

```text
src/
├── app/                        # Expo Router screens
├── components/                 # Design-system primitives + charts
├── features/                   # expenses, categories, vendors, dashboard
├── database/
│   ├── migrations/
│   ├── repositories/
│   └── database.ts
├── services/
│   ├── sync/
│   ├── attachments/
│   ├── pdf/
│   └── export/
├── store/                      # Zustand
├── types/
└── utils/
```



### Backend (`apps/api`)

Feature modules: `auth`, `users`, `expenses`, `categories`, `subcategories`, `vendors`, `dashboard`, `attachments`, `sync`, `common`. Each module owns controller, service, DTOs, and Nest module.

---



## 5. Domain model (implementation notes)



### Identifiers


| ID                            | Role                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `id` (UUID)                   | Primary key on all entities; sent on every sync to make retries idempotent |
| `expenseId` (`DDMMYY-HHMMSS`) | User-visible; unique **per user** in Neon; shown on lists, details, PDFs |


Generate `expenseId` on the device at save time so offline records already have a display ID. Enforce uniqueness locally and on the server. If a collision occurs (two saves in the same second), append a short suffix or bump seconds and retry locally.

### Expense


| Field                                                                    | Required | Notes                                                            |
| ------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------- |
| `id`                                                                     | Yes      | UUID                                                             |
| `expenseId`                                                              | Yes      | `DDMMYY-HHMMSS`                                                  |
| `expenseDate`                                                            | Yes      | Defaults to today; must not be in the future                     |
| `categoryId`                                                             | Yes      | Must exist and be active (or still valid if later deactivated)   |
| `subCategoryId`                                                          | No       | Must belong to `categoryId` when present                         |
| `amount`                                                                 | Yes      | `> 0`                                                            |
| `paymentMethod`                                                          | Yes      | Cash, UPI, Bank Transfer, Credit Card, Debit Card, Cheque, Other |
| `description`, `vendorId`, `gstRate`, `gstAmount`, `billNumber`          | No       | Description max 200 characters. `gstRate` preset or custom 0–100. GST amount derived from rate × amount unless user overrides. Aggregations and list amounts use amount + gstAmount when GST is set. No notes field on expenses. No payment-status field in V1. |
| `syncStatus`                                                             | Yes      | `SYNCED` | `PENDING` | `SYNCING` | `FAILED`                      |
| `createdAt`, `updatedAt`                                                 | Yes      | `updatedAt` used for last-write-wins conflicts                   |




### Related entities

- **Category / subcategory:** user-managed; seed defaults (Office, Travel, Utilities, …); support edit and deactivate (do not hard-delete if expenses reference them). Cloud rows are keyed by **`(userId, id)`** so default seed UUIDs do not leak across accounts.
- **Vendor:** optional on expense; `vendorId` nullable. **UI and sync are deferred**; tables stay in schema.
- **ExpenseAttachment (V2):** metadata in SQLite (`fileName`, `fileType`, `fileSize`, `localFilePath`, `cloudObjectPath`, `syncStatus`). Table ships in V1 migrations but UI and services stay disabled until V2.
- **Business profile:** deferred (tables remain; not synced or linked in More).
- **SyncQueue:** `entityType`, `entityId`, `operation`, `payload`, `retryCount`, `status`.
- **Budget:** `categoryId`, `periodType`, `periodStart`, `periodEnd`, `amount`; unique per `(userId, categoryId, periodStart, periodEnd)` in Neon; unique per `(categoryId, periodStart, periodEnd)` locally when not deleted.
- **DebtPerson:** `name`, `mobileNumber`, `direction` (`TAKEN` | `GIVEN`); unique `(userId, mobileNumber)`.
- **DebtTransaction:** `personId`, `type`, `amount`, `transactionDate`, optional `note`; balance computed in services (shared helpers in `packages/shared`).



### Indexes (local and cloud)

`expenses.expenseDate`, `categoryId`, `subCategoryId`, `vendorId`, `paymentMethod`, `createdAt`, `expenseId`, plus unique indexes on `id` and **`(userId, expenseId)`** in Neon. Shipped SQLite/Prisma still include an unused `payment_status` column (default `Paid`) so existing databases are not rewritten; the app does not read, write, filter, or display it except inserting the column default on create.

---



## 6. Sync design



### Queue operations

`CREATE`, `UPDATE`, `DELETE` for expenses, categories, subcategories, **budgets**, **debt_person**, and **debt_transaction**. Vendor and business-profile queue entries are **deferred** (not pushed). Attachment queue entries are **V2** only. Push order: masters → expenses → budgets → debt people → debt transactions.

Push and pull are authorized with JWT. The server stamps **`userId` from the token** on every upsert and change-log row. Pull uses `GET /sync/changes?since=` filtered by that `userId`.

### Engine responsibilities

- Detect connectivity; when the device comes back online, drain the queue immediately.
- After each local create, update, or delete (expenses, categories, subcategories), attempt a background push if the network is available.
- Drain `PENDING` / `FAILED` items in stable order (masters before expenses).
- Upload JSON payloads only. Do not upload receipt files in V1.
- Map HTTP success to `SYNCED`; failures increment `retryCount` and set `FAILED`.
- Pull remote changes (`GET /sync/changes?since=`) so a second device converges.
- Never require the user to “press Sync” for normal use; expose status under Data Management.



### Duplicate prevention

The client always sends the same UUID. The server upserts by **`(userId, id)`** for categories/subcategories and by **`id` plus ownership check** for expenses. Retries must not create a second row. A UUID that belongs to another user is rejected.

### Conflicts (V1)

Last-write-wins using `updatedAt` (and a server-received timestamp if clocks disagree). One owner per cloud dataset in this slice; richer merge and shared-business are out of scope.

### Attachment handling (V2 — not V1)

Receipt photos/PDFs are **out of V1**. Schema and commented mobile/API code remain for V2. When enabled: save locally, metadata in SQLite, no cloud upload until a later object-storage phase. See section 17.

---



## 7. API surface (V1)

REST over HTTPS. JWT on all non-auth routes. Validate with Zod/class-validator; Prisma for persistence.


| Area          | Methods                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Auth          | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` (phone login; bcrypt password hashes; refresh 30d) |
| Expenses      | `POST/GET /expenses`, `GET/PATCH/DELETE /expenses/:id`                                           |
| Categories    | `POST/GET /categories`, `PATCH/DELETE /categories/:id`                                           |
| Subcategories | `POST/GET /categories/:categoryId/subcategories`, `PATCH/DELETE /subcategories/:id`              |
| Vendors       | Deferred. Tables remain; no sync apply.                                                          |
| Dashboard     | `GET /dashboard/summary`, `/weekly`, `/monthly`, `/top-categories`                               |
| Sync          | `POST /sync`, `GET /sync/changes` (both **user-scoped**)                                         |
| Attachments   | None in V1. V2: local device files; later signed URLs if cloud files are added.                  |
| Profile       | Deferred. `GET/PATCH /business-profile` not used in this slice.                                  |


Dashboard endpoints are for a future web client and for debugging. **The mobile dashboard must compute from SQLite** so it works offline.

Exact sync payload shape is finalized in Phase 5; keep it batch-oriented (`changes[]` with entity type, operation, UUID, `updatedAt`, data).

---



## 8. Mobile UX and technical stack



### Navigation

Bottom tabs (exactly three): **Home** (dashboard), **Add** (center), **More**. Home and More are root screens with no back button. The bar is flat white (72dp + safe area), subtle top border `#E5E7EB`, no FAB or curved notch; Add uses an inline filled green circle icon. Active tab green icon/label; inactive gray. Tapping Add does not change the selected tab; it opens a tall centered fade-in add-expense popup on the current screen. After save, a centered fade-in confirmation popup lists every entered field as two columns (label left, value right). Short labels and values stay on one line; long description text wraps in the value column. Done returns to Home. Home has an outline history icon in the title row that opens the Expenses list.

**More:** Expenses (full list, search, filters), Categories, Subcategories, Vendors, Reports, Business Profile, Data Management, Settings (account, log out, in-app PIN, Face / fingerprint unlock toggles; no login form).

### Fast add

All expense fields are on one tall centered fade-in modal (amount, category, subcategory if any exist, payment method, date today or earlier, vendor, GST, bill number, description max 200 characters). Optional fields may be left blank. Future dates are not allowed. Receipt attachments are **V2** (expense detail screen when enabled). Entry is not a full-screen tab.

### Stack


| Concern                 | Choice                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| App                     | Expo + TypeScript + Expo Router                                     |
| State                   | Zustand                                                             |
| Forms                   | React Hook Form + Zod                                               |
| Local DB                | SQLite + migrations                                                 |
| Files / camera / picker | Expo FileSystem, Camera, ImagePicker, DocumentPicker                |
| Charts                  | React Native–compatible chart library (choose in Phase 7)           |
| Styling                 | StyleSheet + small design system (Button, Input, Card, BottomSheet) |
| PDF                     | On-device generation + OS share sheet                               |




### UX rules

Clean, touch-friendly, adaptive layouts, accessible labels, no emojis, icons from one library. User-facing errors only (never SQLite/HTTP/Prisma dumps). Sync failures: “Some changes couldn’t be synced. We’ll try again automatically.”

### Performance targets

Dashboard, list, search, and filters feel instant from SQLite. Create/edit/delete persist immediately. Comfortable with thousands of local expenses. When V2 attachments ship, file I/O must not block expense save.

---



## 9. Delivery phases

Build in this order so the app is usable locally before cloud complexity lands. Auth can be a stub in early phases and locked down in Phase 10; do not ship production without Phase 2 + 10.

### Phase 1 — Project foundation

**Goal:** Runnable Expo app, design tokens, navigation shell, SQLite bootstrap.

- Initialize Expo (TypeScript), Expo Router, folders above.
- Design system primitives: typography, spacing, colors, Button, Input, Card.
- Bottom navigation (Home, Add, More) with placeholder screens. Expense list is reached from More, not as a fourth tab.
- SQLite open + migration runner; empty tables for users, categories, sub_categories, vendors, expenses, expense_attachments, sync_queue, business_profile.
- Zustand stores for session/UI only (not a substitute for SQLite).

**Exit:** App launches on iOS/Android simulator; tabs work; database file is created.

### Phase 2 — Cloud foundation

**Goal:** NestJS on Render talking to Neon PostgreSQL. No cloud bucket.

- Render web service; Neon project and Postgres database.
- NestJS + Prisma schema mirroring local entities (PostgreSQL in production).
- JWT register (name, phone, password, recovery email) / login (phone + password) / refresh (30 days) / `GET /auth/me`; protect routes; stamp `userId` on synced entities; never store plaintext passwords.
- Health check and environment-based config (no secrets in the mobile app).
- Deploy Render; HTTPS only.

**Exit:** Authenticated `GET` against a protected ping/route from a REST client succeeds.

### Phase 3 — Master data

**Goal:** Categories, subcategories, vendors fully managed offline, then synced.

- Seed default categories/subcategories on first launch.
- CRUD + deactivate; subcategory list filtered by parent category.
- Hide subcategory field when the category has none.
- Repositories hide SQL from UI.
- API modules + sync for these entities (can be “online only” until Phase 5, but prefer writing through the queue from day one).

**Exit:** Owner can create Office → Stationery and a vendor without the network; data survives app restart.

### Phase 4 — Expense management

**Goal:** Complete expense lifecycle on SQLite.

- Fast Add popup with every expense field on one page.
- Validation: amount > 0, category, payment method, subcategory belongs to category, date not in the future, description at most 200 characters.
- Generate UUID + `expenseId`.
- List (ID, date, category, subcategory, description, payment method, amount).
- Search: expense ID, description, bill number, vendor, category.
- Combinable filters: date range (date picker), category, subcategory, vendor, payment method, amount range.
- List toolbar: outline filter and export-PDF icons, right-aligned.
- Detail, edit, delete.

**Exit:** Full CRUD, search, and filters work offline; dashboard still placeholder is acceptable.

### Phase 5 — Offline sync engine

**Goal:** Automatic, idempotent sync.

- Connectivity detection; queue drain; retry/backoff.
- `POST /sync` + `GET /sync/changes`.
- Duplicate UUID handling tests.
- Last-write-wins on `updatedAt`.
- Data Management screen: sync status (read-only for V1 automation).

**Exit:** Create/edit/delete offline; after network returns, Neon matches **that user’s** records; a second device signed into the **same** account receives expense/master data, not receipt files. A different account never receives those rows. No duplicates after forced retries.

### Phase 6 — Attachments (**deferred to V2**)

Not part of the V1 MVP. Implementation order and exit criteria live in **section 17**. V1 keeps the `expense_attachments` table and commented service code only.

### Phase 7 — Dashboard

**Goal:** Home tab answers the PRD questions from local data.

- Cards: today, this week, this month, this year.
- Month-over-month % with increase/decrease (icons + typography, no emojis).
- Top 5 categories (horizontal bars), directly below month-over-month; never more than five.
- Weekly history: last 7 calendar days, newest first.
- Monthly history: current calendar year only, newest first, five-month visible window with in-section scroll.
- No recent-expense list on Home; history icon on the Home title row and More → Expenses open the full list.

**Exit:** All widgets correct with airplane mode on; values update immediately after save. No AI insights in this phase.

### Phase 8 — PDF

**Goal:** Local PDF generation and share.

- Individual expense PDF: expense fields (business profile deferred; attachment names when V2 is enabled).
- Filtered report PDF: period, totals, count, table of ID / date / category / amount; respects current filters.
- Write to local files; share via the OS.

**Exit:** Both PDF types generate with no network.

### Phase 9 — UX polish

- Empty, loading, and error states.
- Adaptive layouts; touch targets; screen-reader labels.
- Light motion; list virtualization if needed.
- Performance pass on dashboard aggregations (SQL `SUM`/`GROUP BY`, not JS over full tables).

**Exit:** First-time user can add an expense and understand Home without explanation; no emojis anywhere.

### Phase 10 — Security and data safety

- Production JWT flow on **launch** (phone + password, or sign up with name, phone, recovery email); token storage in secure storage; **user-scoped sync** (each login is a separate Neon dataset).
- Refresh tokens last **30 days**. Optional **in-app PIN** (create, update, remove in Settings) is separate from the phone lock. If Face or fingerprint is enrolled on the device, Settings exposes **Face** and **Fingerprint** toggles to unlock this app. Biometric prompts must not fall back to the phone PIN. Do not prompt the user to set a phone OS lock.
- Logout clears on-device financial data; re-login pulls that account from Neon.
- Validate all API input (no cloud file URLs in V1).
- Manual export (and backup/restore if time allows; export is the V1 must).
- Confirm credentials never ship in the mobile binary.

**Exit:** Security checklist in section 11 is satisfied.

---



## 10. Cross-cutting work


| Area            | Rule                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------- |
| GST             | Optional preset 0 / 5 / 12 / 18 / 28 or custom % (0–100); compute gstAmount; totals use amount + gstAmount; no filing |
| Soft deactivate | Categories used by expenses stay resolvable in history (vendors when that feature returns)          |
| Deletes         | Tombestone or queue `DELETE` so sync removes cloud rows                                             |
| Currency        | INR display (`₹`) in V1                                                                             |
| Extensibility   | Feature modules stay isolated so Customers / Invoices / optional AI insights can be added later without rewriting expenses |
| Icons           | One icon library; labels remain primary                                                             |


---



## 11. Testing strategy


| Layer      | What to prove                                                         |
| ---------- | --------------------------------------------------------------------- |
| Unit       | Expense ID format, GST math, filter composition, last-write-wins      |
| Repository | SQLite CRUD, indexes, subcategory-belongs-to-category                 |
| Sync       | Retry idempotency, queue ordering, conflict winner                    |
| API        | Authz, validation, unique constraints                                 |
| Device     | Airplane mode: create, search, dashboard, PDF, then sync on reconnect |
| Regression | Two accounts isolated on Neon; same account on two devices; attachment upload failure/retry (V2) |


Automate API and sync tests first; run critical mobile flows on a simulator each phase.

After every code change, confirm `npm run typecheck` passes and that a running Expo/Metro (or API) server still bundles without parse/syntax errors. Fix bundler failures in the same change.

---



## 12. Security checklist

- [ ] HTTPS only
- [ ] No database keys in the app
- [ ] Authenticated APIs
- [ ] Server-side validation of amounts, FKs, file types/sizes (local attachments)
- [ ] Users only see their own account’s data
- [ ] Secure token storage (refresh 30 days); optional in-app PIN; optional Face / fingerprint unlock from Settings

---



## 13. Risks and mitigations


| Risk                                       | Mitigation                                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| Clock skew / duplicate `DDMMYY-HHMMSS`     | UUID is canonical; unique constraint + local collision retry    |
| Sync bugs causing duplicates or lost edits | Idempotent upserts; integration tests; visible FAILED retry     |
| Large images filling disk                  | Compress camera captures; size limits; don’t block expense save |
| Prisma/SQLite schema drift                 | Shared field list in Docs; migrate both in the same PR          |
| Cloud cost                                 | Render free/sleeping instance + Neon free tier; paid if always-on |
| Lost phone loses receipts (V2)             | Manual export; device-only files when attachments ship           |
| Over-building billing                      | Keep expense module independent; no invoice tables in V1        |
| Shipping AI in V1 or blocking offline use  | Keep insights post-V1 and network-optional; V1 metrics stay local SQL |


---



## 14. Suggested implementation order (dependency view)

```text
Phase 1  Foundation
    ├─► Phase 3  Master data ─┐
    │                         ├─► Phase 4  Expenses ─► (V2) Attachments
    │                         │         │
    │                         │         ├─► Phase 7  Dashboard
    │                         │         └─► Phase 8  PDF
    └─► Phase 2  Cloud ───────┴─► Phase 5  Sync ─────► Phase 10 Security
                                              │
                                              └─► Phase 9  Polish (throughout, freeze at end)
```

Practical sequence for a small team: **1 → 3 → 4 → 7 (local) → 8 → 2 → 5 → 9 → 10**. Connect **Render + Neon** in Phase 2 for production record sync. **Attachments (V2, section 17)** and optional AI insights (section 16) start only after V1 DoD.

---



## 15. MVP definition of done

The V1 MVP is complete when all **47** PRD V1 checklist items pass (items 40–42 are V2; see PRD section 73), grouped as:

1. **Expense** — offline create/edit/delete/detail; required and optional fields; search + filters.
2. **Dashboard** — period totals, month-over-month, top 5 categories, weekly/monthly charts.
3. **Management** — create/edit/deactivate categories and subcategories (vendors later).
4. **Documents** — individual + filtered PDF export, offline (no receipt attachments in V1; no business-profile block until that feature returns).
5. **Cloud** — JWT login on launch (phone + password); sync expenses, categories, subcategories to **Render → Neon** **per user**; retry; no duplicates; no cross-account reads.
6. **Offline** — core app + dashboard from SQLite; pending **record** work uploads when connectivity returns.

Final product definition (from the PRD):

> An offline-first, cloud-backed, mobile-only business expense management application with **per-login** cloud data isolation.

---



## 16. Later: optional AI insights (not V1)

**Decision:** We **may** add AI later to read **payment / expense history** and produce **suggestions** and **better metrics**. This is not committed to V1 and must not delay or replace Phases 1–10.

**Intent (when built):**

- Use stored expense and payment history (amount, date, category, subcategory, vendor, payment method) to surface insights the V1 dashboard does not: unusual spend, category or vendor concentration, payment-method mix, and suggested next actions (for example review a spiking category).
- Improve metrics with AI-assisted summaries and highlights **in addition to** the existing deterministic cards and charts — not as a replacement.

**Constraints:**

- Recording and viewing expenses, and V1 dashboard widgets, must keep working fully **offline** without an AI model.
- Insights that call an external model are network-dependent; show a clear empty/unavailable state when offline or if the user has not opted in.
- Do not send secrets, attachments, or more personal/business data than needed; prefer aggregates or a bounded history window over dumping the full database.
- Do not treat this as GST filing, government APIs, or advanced financial forecasting. Those stay out of scope unless decided separately.
- Vendor, model, and whether inference is on-device vs backend are **undecided**. Choose only when this work is scheduled; keep the expense module independent so AI can sit behind a dedicated service/API without rewriting SQLite or Phase 7 aggregations.

**When to start:** After V1 MVP definition of done (section 15). Until then, do not add AI SDKs, insight screens, or model API keys.

---

## 17. V2: receipt attachments (not V1)

**Decision:** Photos and PDF receipts on expenses ship in **V2**, after V1 MVP. V1 keeps SQLite `expense_attachments`, repositories, and **commented** mobile/API attachment code; do not expose attachment UI or upload routes in V1.

**Intent (when built):**

- Take photo / choose photo / choose PDF (JPG, JPEG, PNG, WEBP, PDF).
- Store under `expenses/{expenseId}/`; metadata in SQLite.
- Viewer + remove on the expense detail screen.
- Files stay on-device initially; no signed upload/download in the first V2 slice unless cloud files are explicitly scoped.

**Exit:** Attach a receipt offline, view it, and optionally list attachment names on exported PDFs. Record sync to Neon via Render is unchanged.

**When to start:** After V1 MVP definition of done (section 15). Uncomment `apps/mobile/src/services/attachments/index.ts` and expense detail UI; re-enable API routes in `sync.controller.ts` only if V2 includes signed URLs.

