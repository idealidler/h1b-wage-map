# H1B GeoWage (site)

Next.js App Router frontend for:
- county-level H-1B prevailing wage visualization
- SOC discovery via AI matching
- SOC discovery via historical employer LCA mappings

## Quick Start

```bash
cd site
npm install
npm run clean
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: local dev server (webpack; stable default)
- `npm run dev:turbo`: local dev server with Turbopack
- `npm run build`: production build (webpack)
- `npm run start`: serve production build
- `npm run clean`: remove `.next` cache/build output
- `npm run lint`: run ESLint

## Current Routes

- `/`: Hero page
  - wage map workspace
  - SOC by employer flow (embedded)
  - data sources section
- `/find`: AI SOC finder page
- `/api/match-soc`: AI SOC matching API endpoint
- `/sitemap.xml`: generated from `src/app/sitemap.ts`

## Core Components

- `src/components/WageMap.tsx`: map rendering, county popup logic, wage level UI
- `src/components/LcaSearch.tsx`: employer -> title -> SOC flow
- `src/components/JobSearch.tsx`: SOC/job search input on hero page
- `src/components/Navbar.tsx`: top-level navigation

## Data Sources in App

- `public/jobs/*.json`: county wage data by base SOC code
- `public/db/*.json`: employer title-to-SOC historical mapping shards
- `public/soc_data.json`: SOC reference used by AI matching and job search

## Project Layout

```text
site/
  src/
    app/
      page.tsx           # Hero + map + employer flow
      find/page.tsx      # AI SOC finder
      api/match-soc/     # AI route
      layout.tsx
      globals.css
    components/
      WageMap.tsx
      LcaSearch.tsx
      JobSearch.tsx
      Navbar.tsx
  public/
    jobs/
    db/
    soc_data.json
```

## Notes

- This repository intentionally uses `public/soc_data.json` as canonical SOC reference for UI/API.
- Generated files like `.next/` and `*.tsbuildinfo` should not be committed.
