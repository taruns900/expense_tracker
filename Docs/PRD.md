# Expense Tracker — Product Requirements Document

| Field | Value |
| --- | --- |
| Version | V1.0 |
| Status | Product Definition |
| Platform | Mobile only |
| Primary users | 1–2 business owners |
| Architecture | Offline-first with cloud synchronization |
| Cloud provider | Render (API) + Neon (PostgreSQL) |
| Database | PostgreSQL on Neon |
| File storage | None in V1 MVP; on-device receipt files in **V2** |
| Backend | NestJS |
| Mobile framework | React Native + Expo |

---

# 1. Product Overview

The Expense Management application is a mobile-first business expense management system designed for one or two business owners.

The application allows users to:

- Record business expenses
- Categorize expenses
- Organize expenses using categories and subcategories
- Optionally associate vendors
- Record payment information
- Record GST information
- Sign in with phone and password on launch so cloud data stays isolated per account
- Attach photos and PDF bills/receipts (**V2**)
- Search and filter expenses
- View expense history
- Analyze spending through dashboards and charts
- Export expenses as PDF

The application is **offline-first**.

This means the application must remain fully usable when there is no internet connection. Data is first written to the local SQLite database and synchronized with the cloud when internet connectivity is available.

Unlike a purely offline application, the V1 MVP requires **sign-in on launch** (phone + password). After that, the app works offline from SQLite. It syncs **structured data** (expenses, categories, subcategories) to **Neon PostgreSQL** via **NestJS on Render**, **scoped to the signed-in user**. **Vendors and business profile are deferred** to a later version (schema and screens stay in the repo, unlinked). Receipt attachments are **not in V1**; they are planned for **V2** (on-device files, no cloud upload in the first V2 slice).

---

# 2. Product Vision

The application should make business expense management extremely simple.

A business owner should be able to open the app, record an expense in a few seconds, and immediately see the impact on the dashboard. Attaching receipts is **V2**.

The application should answer questions such as:

- How much did I spend today?
- How much did I spend this week?
- How much did I spend this month?
- How much have I spent this year?
- Which categories consume the most money?
- What were my recent expenses?
- How much did I spend compared with last month?
- What was a particular expense for?
- Where is the receipt for that expense?

The experience should feel simple and lightweight rather than like a complicated accounting application.

---

# 3. Product Principles

## 3.1 Offline first

After sign-in, the user should never be blocked from recording or viewing expenses because of poor connectivity. First launch and expired sessions need the network to log in or register.

## 3.2 Local-first interaction

The UI should primarily read and write to the local SQLite database.

Cloud synchronization happens in the background.

## 3.3 Cloud-backed

The cloud acts as the centralized source for long-term persistence, backup, and future multi-device access.

## 3.4 Fast entry

Recording a basic expense should require minimal interaction.

## 3.5 Simple UI

The interface should be clean, adaptive, and easy to understand.

## 3.6 Minimal mandatory information

Only information genuinely required to record an expense should be mandatory.

## 3.7 Extensible architecture

The architecture should support future billing management and other business modules without requiring a complete rewrite.

---

# 4. Goals

## G1. Fast Expense Entry

The user should be able to record a basic expense using:

- Expense date
- Category
- Amount
- Payment method

These are mandatory.

Optional information can be added when required.

---

## G2. Offline Functionality

The application must allow the user to perform core operations without internet access.

Offline operations include:

- Create expense
- Edit expense
- Delete expense
- View expense
- Search expenses
- Filter expenses
- View dashboard
- Manage categories
- Manage subcategories
- Generate expense PDF
- Generate expense reports where data is locally available
- Create and manage **budgets** (per category and period) offline
- Track **debt** with people and transactions offline

---

## G3. Cloud Persistence

When internet connectivity is available:

```text
Mobile App
    ↓
NestJS API (Render)
    ↓
Neon PostgreSQL
```

Local **record** changes should automatically synchronize with Neon via Render. Receipt attachments are **V2**, not V1.

---

## G4. Useful Dashboard

The dashboard should provide:

- Today's expense
- Current week's expense
- Current month's expense
- Current year's expense
- Month-over-month comparison
- Top 5 categories
- Weekly history (last 7 days, newest first)
- Monthly history (current year, newest first)

Home does not show a recent-expense list. Full history is **More → Expenses**.

V1 values are computed from local SQLite. Optional later AI insights on payment history must not replace these widgets (see Future AI Insights).

Home also shows **category-wise budget remaining** for budget periods that include today. Each line shows period type, period label, and **remaining only** (budget minus matching expenses in that period; negative values allowed). No global budget totals on Home.

Bottom navigation: **Home**, **Budget**, **Add** (center), **Debt**, **More**.

---

## G5. Budget (V1)

- Budget = existing **category** + period type (`DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`) + deterministic `periodStart` / `periodEnd` + amount `> 0`.
- Uniqueness: one budget per category per exact period (enforced locally and in the cloud).
- Remaining = budget amount minus sum of expenses for that category with `expenseDate` in `[periodStart, periodEnd]`. Not stored as authoritative balance.
- Budget screens do not create categories.

## G6. Debt (V1)

- **Debt person:** name + **unique mobile number per account**; direction `TAKEN` (you owe) or `GIVEN` (they owe you).
- **Transactions:** `BORROWED` / `REPAID` (taken) or `GIVEN` / `RECEIVED` (given); amount `> 0`; `transactionDate` (past, today, or future); optional note.
- Outstanding is derived from transactions only. **Debt transactions are not expenses** (no automatic expense rows).

Income, loans, and linked cash-flow are **out of scope** for V1.

---

# 5. Non-Goals for V1

The following are not required initially:

- Web application
- Complex role hierarchy
- Approval workflow
- Employee management
- Accountant role
- Advanced accounting
- GST return filing
- Government GST integration
- Complex multi-company management
- Microservices architecture
- Real-time collaboration
- Advanced financial forecasting
- AI-generated insights, suggestions, or AI-computed metrics on payment history
- Cloud object storage for photos/PDFs (GCS, S3, R2, etc.)
- Syncing receipt files to a second device
- **Expense receipt attachments** (photos/PDFs on expenses) — **V2** (see sections 21–24)

The system is initially intended for individual business owners, each with their own cloud account. A later version may let two owners share one business; V1 does **not** share Neon rows across logins.

V1 dashboard metrics are calculated locally from SQLite. AI insights on payment history are a **possible later addition**, not a V1 requirement (see Future AI Insights).

---

# 6. Why a Backend Is Required

Because the application syncs structured data to Neon from V1, a backend is necessary.

The mobile application should **not directly connect to PostgreSQL**.

The architecture should be:

```text
Mobile App
    │
    │ HTTPS
    ▼
NestJS Backend (Render)
    │
    ▼
Neon PostgreSQL

Receipt files: V2 (on-device when enabled)
```

The backend provides:

### Security

Database credentials must never be embedded in the mobile application.

### Business logic

The backend can handle:

- Expense validation
- Expense ID generation
- GST calculations
- Authorization
- Data integrity
- Future billing logic

### Synchronization

The backend acts as the synchronization endpoint between the local mobile database and the cloud database.

### Attachments (V2)

The V1 backend does **not** store or serve receipt files. Attachment UI and mobile services are disabled in V1. V2 adds on-device files under local application storage; cloud object storage can be added later.

### Future extensibility

The same backend can later support:

- Billing
- Customers
- Products
- Invoices
- Payments
- Vendors
- Web application
- Optional AI insights over expense / payment history (suggestions and richer metrics)

Therefore, even though V1 is mobile-only, having a backend from Day 1 is the correct architecture.

---

# 7. High-Level Architecture

```text
                         MOBILE DEVICE
                              │
                    React Native + Expo
                              │
             ┌────────────────┴────────────────┐
             │                                 │
          UI Layer                       Local Data Layer
             │                                 │
             │                              SQLite
             │                                 │
             │                         Local File Storage
             │                                 │
             └───────────────┬─────────────────┘
                             │
                     Connectivity Layer
                             │
                    Internet Available
                             │
                             ▼
                       NestJS Backend (Render)
                             │
                             ▼
                    Neon PostgreSQL

        Receipt files: V2 (local file storage when enabled)
```

---

# 8. Offline-First Data Flow

## When offline

```text
User
 ↓
Mobile App
 ↓
SQLite
 ↓
UI immediately updated
```

The user continues working normally.

## When online

```text
SQLite
   ↓
Sync Engine
   ↓
NestJS API (Render)
   ↓
Neon PostgreSQL
```

Attachments (**V2**): files stay on the device. SQLite keeps metadata (`localFilePath`). `cloudObjectPath` remains unused until a later cloud-files phase.

---

# 9. Source of Truth

The application should use different sources of truth for different purposes.

### During normal interaction

SQLite is the local source of truth for the mobile UI.

### Cloud

Neon (via the NestJS API on Render) is the centralized source of truth for **synchronized records**. Receipt attachments are **V2**; when enabled, files on the device are the source of truth for those attachments.

This allows the application to remain responsive even with unreliable connectivity.

---

# 10. Target Users

## Primary user

Business owner responsible for recording and monitoring business expenses.

## Secondary user

Not in this slice. Each login has a separate cloud dataset. Shared-business membership is a later version.

There is no role hierarchy in V1.

---

# 11. Expense Creation

## Required fields

The following fields are mandatory:

1. Expense date (today or earlier; future dates are not allowed)
2. Category
3. Amount
4. Payment method

## Optional fields

- Subcategory
- Description (maximum 200 characters)
- Vendor
- GST
- Bill number
- Attachment

---

# 12. Fast Expense Entry UX

Tapping **Add** on the bottom bar must **not** leave the current screen (Home or More). It opens a **centered** popup on top of that screen, with a **fade-in** transition. The add popup is **tall** (most of the screen height) so the form is usable without feeling cramped. After save, the confirmation popup uses the same centered fade-in.

Recommended layout inside the popup:

```text
Add Expense

Amount
₹ __________

Category
[ Select Category ]

Subcategory
[ Select Subcategory ]

Payment Method
[ Select Payment Method ]

Date
[ Today ]

Vendor
[ Optional ]

GST rate
[ Optional ]

Bill number
[ Optional ]

Description
[ Optional ]

[ Cancel ]  [ Save Expense ]
```

The user should not be forced to enter optional information.

The primary use case should still be amount, category, payment method, and date, then Save. Optional fields stay visible and empty.

After a successful save, close the add popup and show a second confirmation popup:

```text
[ green check icon ]

Successful

Amount              ₹2,500
Date                12 Sep 2026
Category            Office
Payment method      UPI
Description         Monthly stationery
…any other fields the user entered

[ Done ]
```

Each expense field is one row: the label on the left and its value on the same row, right-aligned. Labels stay whole (for example Payment method). Short values stay whole (for example UPI, Cash, Bank Transfer). If a longer value such as description does not fit one line, wrap extra text in the value column at word boundaries. Show every field the user entered, including description. Empty optional fields are omitted. The heading is **Successful**. **Done** dismisses the popup and returns to **Home**.

---

# 13. Payment Method

Payment method is mandatory.

Supported methods:

```text
Cash
UPI
Bank Transfer
Credit Card
Debit Card
Cheque
Other
```

The user must select one before saving the expense.

Example:

```text
Payment Method *

[ UPI ]
```

If the user attempts to save without selecting a payment method:

```text
Please select a payment method.
```

---

# 14. Payment Status

Payment status is **not** a V1 field. The app does not collect, display, filter, or export it.

---

# 15. Expense ID

Every expense must have a human-readable ID following this format:

```text
DDMMYY-HHMMSS
```

Example:

```text
100926-183045
```

Meaning:

```text
10 September 2026
18:30:45
```

The Expense ID should be displayed throughout the application.

For example:

```text
Expense ID
100926-183045
```

The ID should be unique and protected by a database uniqueness constraint.

The system should also maintain an internal technical primary key, preferably UUID, separately from the human-readable Expense ID.

This provides:

```text
Internal ID
UUID

User-facing Expense ID
DDMMYY-HHMMSS
```

The timestamp ID is the identifier visible to the user, while the UUID supports reliable database relationships and future synchronization.

---

# 16. Category Management

Categories provide the primary classification of expenses.

Initial categories may include:

```text
Office
Travel
Utilities
Marketing
Maintenance
Communication
Professional Services
Inventory
Bank Charges
Miscellaneous
```

Users can add, edit, deactivate, and organize categories.

Categories should not be hard-coded into the application.

---

# 17. Subcategory Management

Each category can have multiple subcategories.

Example:

```text
Office
├── Stationery
├── Furniture
├── Electronics
├── Cleaning
└── Other

Travel
├── Flight
├── Hotel
├── Cab
├── Fuel
└── Other

Utilities
├── Electricity
├── Internet
├── Water
└── Mobile
```

Relationship:

```text
Category 1 ───── N SubCategory
```

---

# 18. Subcategory UX

After selecting a category, the application should display only the relevant subcategories.

Example:

```text
Category
Office

Subcategory
[ Stationery ]
```

If the selected category has no subcategories, the subcategory field should not be shown.

Subcategory is optional.

---

# 19. Vendor Management

Vendor selection is optional.

An expense can be created without a vendor.

Example:

```text
Vendor
[ Select Vendor ]
```

The user can skip this field.

Vendor information:

```text
Vendor
----------------
id
name
email
phone
address
gstNumber
isActive
createdAt
updatedAt
```

Relationship:

```text
Vendor 1 ───── N Expense
```

`vendorId` is nullable.

---

# 20. GST Management

GST information is optional.

Potential fields:

```text
gstRate
gstAmount
```

Supported common rates:

```text
0%
5%
12%
18%
28%
```

Example:

```text
Amount
₹10,000

GST Rate
18%

GST Amount
₹1,800
```

Detailed GST filing, government integration, and return generation are outside V1.

---

# 21. Attachments

> **V2 — not in the V1 MVP.** Requirements below apply when receipt attachments ship. Schema and commented code remain in the repo during V1.

An expense can contain one or multiple attachments.

Supported formats:

```text
JPG
JPEG
PNG
WEBP
PDF
```

The user should be able to:

- Take a photo
- Select an existing photo
- Select a PDF

---

# 22. Attachment UX

```text
Attachments

[ Take Photo ]

[ Choose Photo ]

[ Choose PDF ]
```

After selection:

```text
Attachments

receipt.jpg
[ View ] [ Remove ]

invoice.pdf
[ View ] [ Remove ]
```

No emojis should be used.

Use standard icons where visual indicators are helpful.

---

# 23. Local Attachment Storage

Attachments should initially be saved locally on the device.

Example:

```text
Application Storage
│
└── expenses/
    ├── 100926-183045/
    │   ├── receipt.jpg
    │   └── invoice.pdf
    │
    └── 100926-190212/
        └── receipt.pdf
```

SQLite should store attachment metadata rather than binary files.

---

# 24. Attachment Storage (V2: device first)

Attachments are saved on the device. They are **not** uploaded to Render, Neon, or any object bucket in the initial V2 slice.

SQLite stores attachment metadata. `cloudObjectPath` may exist on the row for a later cloud-files phase but stays empty in the first V2 slice.

Example:

```text
ExpenseAttachment
----------------------------
id
expenseId
fileName
fileType
fileSize
localFilePath
cloudObjectPath   (unused until cloud files)
syncStatus        (local file lifecycle; not a cloud upload in V2 slice 1)
createdAt
```

Viewing receipts, attaching files, and including attachment names on PDFs work offline when V2 is enabled. A second device that syncs the expense **will not** receive the photo or PDF until a later cloud-files phase.

---

# 25. Expense Data Model

Recommended structure:

```text
Expense
----------------------------
id                  UUID
expenseId           DDMMYY-HHMMSS

expenseDate

categoryId
subCategoryId

amount

description
vendorId

gstRate
gstAmount

paymentMethod

billNumber

syncStatus

createdAt
updatedAt
```

---

# 26. Expense Attachment Model

```text
ExpenseAttachment
----------------------------
id
expenseId

fileName
fileType
fileSize

localFilePath
cloudObjectPath

syncStatus

createdAt
updatedAt
```

Relationship:

```text
Expense 1 ───── N ExpenseAttachment
```

---

# 27. Sync Status

Because the application is offline-first, records need synchronization states.

Possible states:

```text
SYNCED
PENDING
SYNCING
FAILED
```

Example:

```text
Expense created offline
        ↓
PENDING
        ↓
Internet available
        ↓
SYNCING
        ↓
Cloud successfully updated
        ↓
SYNCED
```

If synchronization fails:

```text
FAILED
   ↓
Retry
```

The user should not need to manually manage synchronization in normal usage.

---

# 28. Offline Sync Requirements

The sync engine should:

- Detect connectivity
- After each local create, update, or delete, attempt to upload pending records
- When connectivity returns, upload pending records without waiting for a timer
- Identify pending records
- Upload changes (records only; not receipt files)
- Retry failed operations
- Update local sync status
- Avoid duplicate records
- Handle basic conflicts
- Continue synchronization after temporary connectivity loss

---

# 29. Duplicate Prevention

Every record must have a stable internal UUID.

If an expense is created offline:

```text
Local Expense
UUID: abc-123
```

When synchronized, the same UUID is sent to the backend.

If the request is retried:

```text
Attempt 1 → Failed
Attempt 2 → Failed
Attempt 3 → Success
```

the backend must recognize the same UUID and avoid creating duplicate expenses.

---

# 30. Conflict Handling

Initially, there will be only one or two users, so conflict handling can remain simple.

For records modified on different devices:

```text
Last Updated At
```

can be used as the initial conflict resolution mechanism.

More sophisticated conflict resolution can be introduced if the product later supports larger teams.

---

# 31. Dashboard

The dashboard is the main landing screen.

It should provide a quick financial overview. V1 widgets are local, deterministic aggregations. AI suggestions on payment history are a possible later addition, not part of this screen in V1.

Home widget order:

```text
Summary cards
Compared with last month
Top categories
Weekly history
Monthly history
```

The Home title row includes an outline history icon on the right. It opens the Expenses list (same screen as More → Expenses).

## Summary

Display:

```text
Today
₹4,500

This Week
₹18,750

This Month
₹72,500

This Year
₹6,45,800
```

---

# 32. Weekly Expense Chart

The Home section is labeled **Weekly history**.

It shows the last seven calendar days as a bar list, newest first (today, then yesterday, and so on).

Example:

```text
12 Sept      ₹4,500
11 Sept      ₹2,000
10 Sept      ₹6,200
9 Sept       ₹1,200
8 Sept       ₹3,800
7 Sept         ₹700
6 Sept           ₹0
```

---

# 33. Monthly Expense Chart

The Home section is labeled **Monthly history**.

It shows only months in the **current calendar year**, newest first (for example September 2026, then August 2026). Future months in the year are not shown.

The visible window is **five months**. The user scrolls inside this section to see earlier months in the same year.

Example (window of five; scroll for January–April):

```text
September 2026    ₹70K
August 2026       ₹57K
July 2026         ₹61K
June 2026         ₹49K
May 2026          ₹72K
```

Use a bar chart or line chart depending on the final UI design.

---

# 34. Top 5 Categories

Display **at most five** categories with the highest expense amounts. Never show more than five.

Use a horizontal bar chart.

Example:

```text
Travel             ₹32K  ███████████
Office             ₹24K  █████████
Utilities          ₹19K  ███████
Marketing          ₹15K  █████
Maintenance        ₹10K  ████
```

The values should be calculated dynamically from expense records.

---

# 35. Month-over-Month Comparison

Show current month compared with previous month.

Example:

```text
This Month
₹72,500

Previous Month
₹65,000

Increase
11.5%
```

If expenses decreased:

```text
Decrease
11.5%
```

The dashboard should make the direction visually clear using icons and typography rather than emojis.

---

# 36. Recent Expenses

Home does not include a recent-expense list.

The latest expenses are part of the full history on **More → Expenses**. Each row there opens the expense detail screen.

---

# 37. Expense List

The complete expense history should be accessible from **Expenses** in the More section.

Each item should display:

- Expense ID
- Date
- Category
- Subcategory if available
- Description if available
- Payment method
- Amount

Example:

```text
100926-183045

Office
Stationery · UPI
₹2,500
```

---

# 38. Expense Search

Search should support:

- Expense ID
- Description
- Bill number
- Vendor
- Category

Search results should update quickly using local SQLite data.

---

# 39. Expense Filters

Supported filters:

```text
Date Range
Category
Subcategory
Vendor
Payment Method
Amount Range
```

Filters should be combinable.

Date range fields open a **date picker** when tapped. Do not require the user to type YYYY-MM-DD.

On the Expenses list, **Filter** and **Export PDF** are outline icons, right-aligned on the toolbar row under search. They are not labeled buttons.

Example:

```text
Category: Travel
Payment Method: UPI
Date: 01-Sep to 10-Sep
```

---

# 40. Expense Details

The detail screen should display all available information.

Example:

```text
Expense

100926-183045

₹2,500

10 Sep 2026

Category
Office

Subcategory
Stationery

Vendor
ABC Stationery

Payment Method
UPI

GST
18% · ₹450

Description
Monthly stationery purchase

Bill Number
INV-1023

Attachments
receipt.jpg
invoice.pdf
```

Actions:

```text
Edit
Delete
Export PDF
```

---

# 41. PDF Export

The application must provide a PDF export option.

There should be two primary PDF use cases.

## 41.1 Individual expense PDF

The user can open an expense and select:

```text
Export PDF
```

The PDF should contain:

- Business information
- Expense ID
- Expense date
- Category
- Subcategory
- Vendor
- Amount
- GST
- Payment method
- Description
- Bill number

If appropriate, attachment information can also be included.

---

# 42. Expense Report PDF

The application should also support exporting a filtered expense report.

Example:

```text
Expense Report

Period:
01-Sep-2026 to 30-Sep-2026

Total Expenses:
₹72,500

Number of Expenses:
42
```

Then:

```text
Expense ID       Date       Category       Amount
100926-183045    10-Sep    Office         ₹2,500
090926-143210    09-Sep    Travel         ₹1,200
080926-101530    08-Sep    Utilities      ₹4,800
```

The report should respect the currently selected filters where applicable.

---

# 43. PDF Generation

PDF generation should work offline.

The application should not depend on a cloud server to generate a basic expense PDF.

The generated PDF should be saved locally and shared/exported using the mobile operating system's native sharing/file functionality.

---

# 44. Navigation

Use a simple bottom navigation structure with exactly three destinations:

```text
Home
Add
More
```

Home is on the left, **Add is in the center**, and More is on the right.

The bottom bar is a flat white strip (72dp tall, plus safe-area inset on devices that need it) with a subtle top border (`#E5E7EB`), no heavy shadow, and no floating action button or curved notch. Home, Add, and More are equal-width tabs in one row. **Add** is the center tab and uses a filled green circular icon with a white plus (inline with the other icons, not raised). Active tab: green icon and green label. Inactive tabs: gray icon and gray label. Tapping Add opens the add-expense popup on the **current** tab (Home or More). It does not switch to a separate Add screen.

The expense list is not a primary tab. Search, filter, and full history live under More → Expenses, and from the history icon on Home.

The interface should use icons where useful, but **no emojis should be used anywhere in the application UI**.

---

# 45. More Section

The More section can contain:

```text
Expenses
Categories
Subcategories
Reports
Data Management
Settings
```

Less frequently used functionality should remain here rather than cluttering the primary navigation.

---

# 46. Business Profile

**Deferred to a later version.** SQLite/Prisma tables and the More screen remain in the repo but are not linked from navigation and are not synced.

When re-enabled, the business profile should contain:

```text
Business Name
Business Address
Phone
Email
GST Number
Logo
```

This information can be used in PDF reports and future billing functionality.

---

# 47. Data Management

The application should provide:

```text
Sync Status
Export Data
Backup
Restore
```

Cloud synchronization is handled automatically.

Manual data export is still recommended as an additional safety mechanism.

---

# 48. Security

Since the application contains financial information, **JWT authentication** is required. Each Neon dataset belongs to one login (`userId`). Passwords are stored only as **bcrypt hashes**. The server never stores or returns the original password. Forgotten passwords are replaced (new hash), not recovered from the hash.

Launch:

```text
Open app
   ↓
Valid refresh token (up to 30 days)?
   ├── No → Login (phone + password) or Sign up
   └── Yes → App lock if an app PIN or enabled biometrics (Face / fingerprint) are on
         ↓
       Home (SQLite; sync that account only to Neon)
```

Sign up fields: **name**, **phone** (login id), **password**, **recovery email** (for a later reset flow or operator support; not used as login). Login fields: **phone** and **password**. Login and sign-up are **not** on Settings.

Rules:

- The app does **not** work as a guest. Sign-in is required before Home.
- After sign-in, core recording and dashboard stay **offline** until the refresh token expires (30 days). Then the user must go online to log in again.
- Neon rows for expenses, categories, subcategories, and the change log carry **`userId` from the JWT**. The client cannot choose another user’s id.
- `GET /sync/changes` returns only the signed-in user’s changes. Users never see another account’s data.
- Logging out **clears data on this device** (cloud data stays on the account). Signing back in **pulls that account** from the cloud. Signing in as a **different** account also replaces local data.
- Access and refresh tokens are stored in secure storage. Refresh tokens last **30 days**. App lock is **separate from the phone’s lock screen**. The user may set an **in-app PIN** (create, update, or remove in Settings). If the phone has Face ID / face or a fingerprint enrolled, Settings also has **separate toggles** to unlock this app with Face or with fingerprint. Turning those on must **not** require setting a phone PIN, and biometric prompts must **not** fall back to the phone lock. The app PIN and biometric toggles do not separate Neon tenants.

No complicated RBAC system is required. Shared-business access is out of this slice. Email/SMS OTP is not required in this slice; an operator with database access may replace `passwordHash` with a new bcrypt hash.

---

# 49. UI/UX Requirements

The UI should be:

### Clean

Avoid unnecessary visual elements. Screen headings have **no** short description underneath.

### Simple

A first-time user should understand the application without training.

### Fast

Common operations should require minimal taps.

### Adaptive

Layouts should adapt to different mobile screen sizes.

### Consistent

Buttons, inputs, cards, typography, spacing and navigation should follow a common design system.

### Touch friendly

Controls should have appropriate touch targets.

### Accessible

Support readable typography, clear labels and screen-reader-friendly controls.

---

# 50. UI Iconography

No emojis should be used in the application.

Use a consistent icon library for actions such as:

```text
Add
Edit
Delete
History
Search
Filter
Calendar
Attachment
PDF
Camera
Settings
Back
More
```

Icons should support the interface rather than replace clear labels.

---

# 51. Mobile Technology Stack

## Frontend

**React Native + Expo**

## Language

**TypeScript**

## Navigation

**Expo Router**

## Local database

**SQLite**

## State management

**Zustand**

## Forms

**React Hook Form**

## Validation

**Zod**

## Local files

**Expo FileSystem**

## Camera

**Expo Camera**

## Images

**Expo Image Picker**

## PDFs

**Expo Document Picker**

## Charts

React Native-compatible charting library.

## Styling

React Native StyleSheet with a custom design system.

---

# 52. Backend Technology Stack

## Backend

**NestJS**

## Language

**TypeScript**

## API

**REST API**

## ORM

**Prisma**

## Authentication

**JWT-based authentication initially**

## Database

**PostgreSQL**

---

# 53. Cloud Technology Stack (V1 MVP)

## Database

**Neon PostgreSQL**

## File storage

**On-device only** (Expo FileSystem). No cloud bucket in V1.

## Backend hosting

**Render** (NestJS web service)

Architecture:

```text
                    Render
                      │
                   NestJS
                      │
                      ▼
                 Neon PostgreSQL

        Photos/PDFs stay on the mobile device
```

---

# 54. Backend Responsibilities

The NestJS backend should handle:

- Authentication
- User management
- Expense APIs
- Category APIs
- Subcategory APIs
- Vendor APIs
- Dashboard aggregation APIs
- Synchronization of structured records (not receipt files)
- Data validation
- Business rules
- Future billing modules

---

# 55. API Structure

## Expenses

```http
POST   /expenses
GET    /expenses
GET    /expenses/:id
PATCH  /expenses/:id
DELETE /expenses/:id
```

## Categories

```http
POST   /categories
GET    /categories
PATCH  /categories/:id
DELETE /categories/:id
```

## Subcategories

```http
POST   /categories/:categoryId/subcategories
GET    /categories/:categoryId/subcategories
PATCH  /subcategories/:id
DELETE /subcategories/:id
```

## Vendors

```http
POST   /vendors
GET    /vendors
GET    /vendors/:id
PATCH  /vendors/:id
DELETE /vendors/:id
```

## Dashboard

```http
GET /dashboard/summary
GET /dashboard/weekly
GET /dashboard/monthly
GET /dashboard/top-categories
```

## Synchronization

```http
POST /sync
GET  /sync/changes
```

The exact synchronization API can be finalized during technical design.

---

# 56. SQLite Database

The mobile database should contain:

```text
users
categories
sub_categories
vendors
expenses
expense_attachments
sync_queue
```

---

# 57. SQLite Sync Queue

The sync queue is required because the application is offline-first.

Example:

```text
SyncQueue
----------------------------
id
entityType
entityId
operation
payload
retryCount
status
createdAt
updatedAt
```

Example:

```text
Expense created
       ↓
SQLite
       ↓
Sync Queue
       ↓
PENDING
       ↓
Internet available
       ↓
Backend
       ↓
SYNCED
```

---

# 58. Repository Architecture

The mobile application should separate UI from data access.

Recommended:

```text
UI
 ↓
Feature Layer
 ↓
Repository Layer
 ↓
SQLite
```

The repository layer should hide the database implementation from the UI.

For example:

```text
ExpenseRepository

createExpense()
getExpense()
getExpenses()
updateExpense()
deleteExpense()
searchExpenses()
filterExpenses()
```

This will make future synchronization easier.

---

# 59. Mobile Project Structure

```text
src/
│
├── app/
│   ├── index.tsx
│   ├── expenses/
│   ├── categories/
│   ├── vendors/
│   └── settings/
│
├── components/
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── BottomSheet/
│   ├── ExpenseItem/
│   └── charts/
│
├── features/
│   ├── expenses/
│   ├── categories/
│   ├── subcategories/
│   ├── vendors/
│   └── dashboard/
│
├── database/
│   ├── migrations/
│   ├── repositories/
│   └── database.ts
│
├── services/
│   ├── sync/
│   ├── attachments/
│   ├── pdf/
│   └── export/
│
├── store/
│
├── types/
│
└── utils/
```

---

# 60. Backend Project Structure

```text
src/
│
├── auth/
├── users/
├── expenses/
├── categories/
├── subcategories/
├── vendors/
├── dashboard/
├── attachments/
├── sync/
├── pdf/
└── common/
```

Each feature should contain its own:

```text
controller
service
DTO
module
```

where appropriate.

---

# 61. Primary Expense Flow

```text
Open App
    ↓
Login or Sign up (or device unlock if already signed in)
    ↓
Dashboard
    ↓
Tap Add
    ↓
Enter Amount
    ↓
Select Category
    ↓
Select Payment Method
    ↓
Date defaults to Today
    ↓
Optional fields on the same form
    ↓
Save
    ↓
SQLite
    ↓
Dashboard updates immediately
    ↓
Internet available?
    │
    ├── No
    │    ↓
    │  Keep pending
    │
    └── Yes
         ↓
       Sync
         ↓
      Backend (Render)
         ↓
      Neon PostgreSQL
```

---

# 62. Attachment Flow

```text
Add Expense
     ↓
Add Attachment
     ↓
Take Photo / Select Photo / Select PDF
     ↓
Save locally
     ↓
Create attachment record in SQLite
     ↓
Expense (and file) available offline on this device
```

V1 does not upload the file. Expense **metadata** may still sync to Neon; the binary stays on the phone.

---

# 63. Dashboard Data Flow

The dashboard should primarily use local data so it works offline.

```text
SQLite
   │
   ├── Today's total
   ├── Weekly total
   ├── Monthly total
   ├── Yearly total
   ├── Category totals
          ↓
      Dashboard
```

When cloud synchronization occurs, local data is updated with cloud changes.

---

# 64. Performance Requirements

The application should feel responsive for normal business usage.

Target behavior:

- Dashboard should load quickly from SQLite.
- Expense list should load quickly.
- Expense creation should save immediately.
- Search should feel instantaneous.
- Filters should respond quickly.
- Opening an expense should be immediate.
- Attachments should not block normal expense operations unnecessarily.

The application should comfortably support thousands of locally stored expenses.

---

# 65. Database Indexes

Indexes should be created for frequently queried fields:

```text
expenses.expenseDate
expenses.categoryId
expenses.subCategoryId
expenses.vendorId
expenses.paymentMethod
expenses.createdAt
expenses.expenseId
```

---

# 66. Error Handling

Errors should be user-friendly.

Avoid:

```text
SQLite constraint violation
HTTP 500
PrismaClientKnownRequestError
```

Instead:

```text
Unable to save the expense.
Please try again.
```

For synchronization:

```text
Some changes couldn't be synced.
We'll try again automatically.
```

The user should not need to understand the technical synchronization process.

---

# 67. Data Integrity

The system must ensure:

- Amount is greater than zero.
- Category exists.
- Subcategory belongs to selected category.
- Payment method is provided.
- Expense ID is unique.
- Internal UUID is unique.
- Deleted expenses are correctly removed or marked for synchronization.
- Attachments belong to valid expenses.
- Cloud and local records maintain consistent identifiers.

---

# 68. Security Requirements

The application must:

- Use HTTPS for all backend communication.
- Never store database credentials in the mobile application.
- Authenticate API requests.
- Validate incoming API data.
- Protect user-specific data.

V1 does not host receipt files in the cloud, so there is no public bucket to lock down. If cloud files are added later, use private storage and short-lived signed URLs.

---

# 69. Data Backup

Neon holds a remote backup of **expense and master-data records**. Receipt files are **not** in that backup in V1. Manual export (and keeping the phone’s app data) is how users protect documents.

The application should still support manual data export.

Recommended future options:

```text
Export Data
Backup Data
Restore Data
```

---

# 70. Future Billing Integration

The expense module should be designed independently from future billing functionality.

Future modules:

```text
Business Suite
│
├── Expenses
├── Customers
├── Products
├── Vendors
├── Quotations
├── Invoices
└── Payments
```

The future billing system can use the same:

```text
NestJS Backend (Render)
PostgreSQL (Neon)
Authentication
Mobile application
```

---

# 71. Future Web Application

A web application is intentionally not part of V1.

However, because the backend is already independent from the mobile application, a future web application can consume the same APIs.

```text
             Backend API
                 │
        ┌────────┴────────┐
        │                 │
   Mobile App         Web App
```

This decision does not need to affect the V1 mobile UI.

---

# 72. Future AI Insights on Payment History

V1 does **not** include AI.

A later version **may** add AI that uses **expense and payment history** to give owners **suggestions** and **better metrics** than the V1 dashboard alone.

Possible later outcomes (not V1 commitments):

- Short insights from history (for example unusual category spend, vendor concentration, payment-method mix).
- Actionable suggestions (for example review a category that is up versus last month).
- AI-assisted metric highlights **in addition to** today / week / month / year totals, charts, top categories, and month-over-month comparison.

Rules if this is built:

- Fast expense entry and the V1 dashboard must remain usable **offline** without AI.
- AI insights may require internet and should fail gracefully when offline or unavailable.
- AI must not replace local SQLite aggregations as the source of V1 dashboard numbers.
- This is not GST filing, government integration, or advanced financial forecasting.

Model vendor, on-device vs cloud inference, and exact UX are undecided until this work is scheduled.

---

# 73. MVP Requirements

The MVP is complete when the user can:

### Expense

1. Create an expense offline.
2. Enter date (today or earlier; future dates are not allowed).
3. Select category.
4. Enter amount.
5. Select payment method.
6. Add optional subcategory.
7. Add optional vendor (**later version**; not in the current UI).
8. Add optional GST.
9. Add description (maximum 200 characters).
10. Add bill number.
11. Attach photo.
12. Open expense history from the Home history icon.
13. Attach PDF.
14. Edit expense.
15. Delete expense.
16. View expense details.
17. Search expenses.
18. Filter expenses.

### Dashboard

20. View today's expenses.
21. View weekly expenses.
22. View monthly expenses.
23. View yearly expenses.
24. View weekly history.
25. View monthly history.
26. View month-over-month comparison.
27. View top 5 categories.
28. View expenses from More → Expenses.

### Management

29. Create categories.
30. Edit categories.
31. Deactivate categories.
32. Create subcategories.
33. Edit subcategories.
34. Deactivate subcategories.
35. Create vendors. (**later version**)
36. Edit vendors. (**later version**)
37. Deactivate vendors. (**later version**)

### Documents (V1)

38. Export an individual expense as PDF.
39. Export a filtered expense report as PDF.

### Documents (V2 — after V1 MVP)

40. View photo attachments.
41. View PDF attachments.
42. Device-only receipt files without required cloud upload in the first attachment release.

### Cloud (V1)

43. Synchronize expenses with the backend (Render → Neon), **scoped to the signed-in user**.
44. Synchronize categories (and subcategories).
45. Synchronize vendors. (**later version**)
45a. Register (name, phone, password, recovery email) or log in with phone + password on launch; cloud data is isolated per account; refresh session lasts 30 days; optional in-app PIN; optional Face / fingerprint unlock toggles in Settings when those are enrolled on the phone (never require a phone OS lock).
46. Retry failed synchronization.
47. Prevent duplicate records.

### Offline

48. Core application functionality works without internet.
49. Dashboard works from local data.
50. Expenses created offline synchronize automatically when connectivity returns.

V1 MVP checklist: items **1–39** and **43–50** (48 items). Items **40–42** are V2.

---

# 74. Development Phases

## Phase 1: Project Foundation

- React Native + Expo
- TypeScript
- Expo Router
- Design system
- SQLite
- Database migrations
- Zustand
- Basic application architecture

## Phase 2: Cloud Foundation

- Render web service for NestJS
- Neon PostgreSQL
- Prisma (PostgreSQL in production; local dummy SQLite remains for offline API work)
- Authentication
- Basic API infrastructure
- No cloud bucket for attachments in V1

## Phase 3: Master Data

- Categories
- Subcategories
- Vendors

## Phase 4: Expense Management

- Create expense
- Edit expense
- Delete expense
- Expense list
- Expense details
- Search
- Filters

## Phase 5: Offline System

- SQLite repositories
- Sync queue
- Connectivity detection
- Background synchronization
- Retry mechanism
- Duplicate prevention
- Conflict handling

## Phase 6: Attachments (**V2 — deferred**)

- Camera, image picker, PDF picker, local file storage, attachment viewer
- Not part of V1 MVP; see sections 21–24

## Phase 7: Dashboard

- Summary cards
- Month comparison
- Top 5 categories
- Weekly chart
- Monthly chart

## Phase 8: PDF

- Individual expense PDF
- Expense report PDF
- Local PDF generation
- Native sharing/export

## Phase 9: UX Polish

- Responsive layouts
- Loading states
- Empty states
- Error states
- Accessibility
- Animations
- Performance optimization

## Phase 10: Security and Data Safety

- Authentication
- PIN/in-app lock and optional Face / fingerprint unlock (Settings; not a phone OS lock)
- Secure storage
- HTTPS + JWT
- Data export
- Backup/restore

Post-V1 (optional, not scheduled):

- AI insights on payment / expense history
- Suggestions and richer metrics, without replacing V1 local dashboard aggregations

---

# 75. Final Architecture

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

              Receipt files: V2 (on-device when enabled)
```

---

# 76. Final Technology Stack

| Layer | Technology |
| --- | --- |
| Mobile | React Native |
| Mobile tooling | Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| UI styling | React Native StyleSheet |
| State | Zustand |
| Forms | React Hook Form |
| Validation | Zod |
| Local database | SQLite |
| Local files | Expo FileSystem |
| Camera | Expo Camera |
| Images | Expo Image Picker |
| PDF selection | Expo Document Picker |
| Charts | React Native chart library |
| Backend | NestJS |
| Backend language | TypeScript |
| API | REST |
| ORM | Prisma |
| Authentication | JWT |
| Cloud database | Neon PostgreSQL |
| Database engine | PostgreSQL |
| Cloud file storage | None in V1; on-device receipt files in V2 |
| Backend hosting | Render |
| PDF generation | Mobile/local PDF generation |
| Offline sync | Custom synchronization layer |
| AI insights (later, optional) | Undecided (on-device or backend); not in V1 |

---

# 77. Final Product Definition

> **An offline-first, cloud-backed, mobile-only business expense management application for one or two business owners.**

The application provides fast expense entry with **date, category, amount, and payment method as mandatory fields**, while keeping subcategory, GST, description (maximum 200 characters), and bill number optional. Vendor and business profile are **deferred**. Expense date cannot be in the future. There is no notes field on expenses. **Receipt attachments are V2.**

Users manage categories and subcategories, search and filter expenses, and analyze spending through weekly, monthly and category-level dashboards. The app opens on login; each account’s Neon data is separate.

The application works without internet using **SQLite**, while automatically synchronizing **records** with **NestJS on Render and Neon PostgreSQL** whenever connectivity is available.

Each expense has a user-facing ID in the format:

```text
DDMMYY-HHMMSS
```

The application also supports **individual expense PDF export and filtered expense report PDF export**.

The UI must remain **clean, simple, adaptive, mobile-first, and free of emojis**, using consistent icons where visual indicators are useful.

The V1 architecture intentionally supports future expansion into **billing management, customers, products, invoices, payments, cloud synchronization improvements, optional AI insights on payment history (suggestions and richer metrics), and potentially a web application**, without requiring the mobile expense module to be redesigned.
