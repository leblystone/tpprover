# TPPRover

Fresh Vite + React + Tailwind scaffold to migrate features from the legacy TPPSpendide app.

## Scripts
- `npm run dev` — start dev server on port 3000
- `npm run build` — production build
- `npm run preview` — preview build

## Stack
- React 18
- Vite 5
- Tailwind CSS 3
- React Router 6

## Setup
1. Install Node 18+.
2. Install dependencies: `npm install`
3. Start: `npm run dev`

## Migration Notes
- Keep existing `.env` values in your current project. Do not copy `.env` here yet.
- Migrate features incrementally by page.
- Use `src/pages/*` for route-level pages and `src/components/*` for shared components.
- Add API keys via `import.meta.env` once routes are stable.