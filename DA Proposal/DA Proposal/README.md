# DA-CAR Agriculture Portal (Next.js + Supabase)

Official digital portal for the Department of Agriculture – Cordillera Administrative Region (DA-CAR), focusing on the Rice Program Coordinating Unit, farmer directories, fund tracking, regional agricultural data, and public transparency.

## Tech Stack
- **Framework:** Next.js 16 (App Router) with TypeScript & Turbopack
- **Backend / Database:** Supabase (PostgreSQL, Auth, RLS, Realtime)
- **Styling:** CSS variables & responsive design system (`app/globals.css`)
- **Icons:** `lucide-react`
- **Charts:** `chart.js`

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

3. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Clean Page Structure

Every page is in its own clearly named folder with a dedicated `page.tsx` for easy maintenance:

- `app/page.tsx` — Main Home Portal (Hero carousel, priority strip, commodity allocation dashboard)
- `app/about/page.tsx` — About the Rice Program Coordinating Unit
- `app/contact/page.tsx` — Department Contact directory & interactive inquiry form
- `app/provinces/page.tsx` — Cordillera 6-province agricultural directory
- `app/market-prices/page.tsx` — Regional commodity market prices
- `app/weather/page.tsx` — Agriculture weather stations and monitoring
- `app/privacy-policy/page.tsx` — Data Privacy notice
- `app/terms-of-use/page.tsx` — Terms of use
- `app/rice/page.tsx` — Rice Coordinating Unit Operations Dashboard
- `app/rice/balances/page.tsx` — Financial balances, disbursements, charts, and transaction modal
- `app/rice/farmers/page.tsx` — Beneficiary registry with search and location sorting
- `app/rice/programs/page.tsx` — Rice programs register with status and location filters
- `app/rice/reports/page.tsx` — Official monitoring reports (ongoing vs completed)
- `app/rice/contact/page.tsx` — Rice Unit contact form
- `app/api/transactions/[balanceId]/route.ts` — Transaction history API endpoint

## Supabase Tables

- `balances` — Financial allocation and disbursement records
- `transactions` — Drilldown transactions linked to a balance
- `programs` — Regional intervention programs
- `provinces` — Province records
- `farmers` — Farmer and beneficiary directory
- `reports` — Published report documents
- `market_prices` — Daily/weekly commodity prices
- `contact_messages` — Public inquiries submitted via contact forms
