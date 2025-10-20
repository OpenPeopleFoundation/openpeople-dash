# Open People Dash

Operational dashboards for Open People built with Next.js 14 and the App Router.

## Prerequisites
- Node.js 18.17+ (same major used by Vercel / Next.js 14)
- npm 9+

## Setup
1. Copy `.env.example` to `.env.local`.
2. Update the environment values:
   - `NEXT_PUBLIC_MEMBERS_PASSWORD` – client-side gate for the `/members` unlock form. Set a non-empty value before deploying.
   - `UPCOMING_SHEET_EXPORT_URL` – CSV export URL for the upcoming tasks Google Sheet.
   - `FINANCE_SHEET_XLSX_URL` – XLSX export URL for the finance workbook.
3. Install dependencies: `npm install`.

## Development
- Start the dev server: `npm run dev`.
- The landing page is served at `/`, the password gate at `/members`, and the dashboards at `/dash`.

## Deployment
- Build: `npm run build`.
- Run in production mode: `npm run start`.
- Ensure the environment variables above are set for your hosting platform before promoting a build.
