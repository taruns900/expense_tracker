# Expense Tracker

Offline-first, cloud-backed **mobile** expense tracker. Each signed-in account has its own Neon data.

Record expenses on device (SQLite) even without internet. When a network is available, the NestJS API on **Render** syncs **that account’s records** to **Neon PostgreSQL**. Vendors and business profile are deferred. Receipt photos/PDFs are planned for **V2**.

Product rules: [`Docs/PRD.md`](Docs/PRD.md). How to build it: [`Docs/PLAN.md`](Docs/PLAN.md). Agent rules: [`AGENT.md`](AGENT.md).

## Stack

- Mobile: React Native, Expo, Expo Router, TypeScript, local SQLite
- API: NestJS, Prisma, REST
- Shared: `@expense-tracker/shared` (enums, GST, expense IDs, defaults)
- Cloud (production): Neon PostgreSQL + NestJS on Render (record sync only in V1)

## Repository

```text
expense_tracker/
├── README.md
├── Docs/                 # PRD + PLAN
├── apps/mobile/          # Expo app
├── apps/api/             # NestJS API
└── packages/shared/      # Shared TypeScript
```

## Prerequisites

- Node.js 20+
- npm
- Xcode (iOS) and/or Android Studio for device simulators

## Setup

```bash
npm --prefix apps/mobile install
npm --prefix apps/api install
npm --prefix packages/shared install
```

Copy env examples (do not commit real secrets):

- `apps/mobile/.env.example` → `apps/mobile/.env`
- `apps/api/.env.example` → `apps/api/.env`

Dummy `CLOUD_MODE` is enough for local work. Replace JWT and set `DATABASE_URL` to Neon before production on Render.

## Run

From the repo root:

```bash
npm start          # Expo (Metro)
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run api        # NestJS on PORT from apps/api/.env (default 3000)
npm run typecheck  # Mobile + shared TypeScript
```

API typecheck: `npm --prefix apps/api run typecheck`.

## App shape (V1)

- Bottom tabs: **Home**, **Add**, **More**
- Home: totals, month comparison, top 5 categories, weekly/monthly history; history icon opens the expense list
- Add: tapping the center tab opens a tall centered fade-in popup with all expense fields; after save a Successful confirmation lists entered details and Done returns to Home.
- More: expenses (search, filters, PDF export), categories, subcategories, reports, data, settings (account / log out)

The UI is offline-first: screens read and write SQLite first; sync runs in the background.
