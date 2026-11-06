# Project Instructions

This is a Next.js (App Router) TypeScript application connected to Supabase.
All pages are built using TSX React Server Components and Client Components located in dedicated, cleanly named folders inside `app/`:

## Page Structure
- `app/page.tsx` — Financial Reports Landing Page (Official financial category reports, ongoing vs completed, budget summaries)
- `app/privacy-policy/page.tsx` — Privacy Policy
- `app/terms-of-use/page.tsx` — Terms of Use
- `app/rice/balances/page.tsx` — Financial balances, disbursements, charts, and transaction drilldown modal
- `app/rice/disbursement/page.tsx` — Disbursement Ledger
- `app/rice/farmers/page.tsx` — Beneficiaries (farmers) directory with search and location sorting
- `app/rice/programs/page.tsx` — Rice programs register with search and filtering
- `app/rice/reports/page.tsx` — Official monitoring reports (ongoing vs completed)
- `app/rice/physical/page.tsx` — Physical Targets & Accomplishments
- `app/commodity-claims/page.tsx` — Commodity Claims Dashboard
- `app/admin/users/page.tsx` — Staff Access Control
- `app/admin/profiles/page.tsx` — Profile Database

## Supabase Integration
- Uses `@supabase/ssr` with `utils/supabase/server.ts` for server components and `utils/supabase/client.ts` for browser components.
- Run `npm run dev` to start the development server.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
