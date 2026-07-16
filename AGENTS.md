# AGENTS.md

## Cursor Cloud specific instructions

Questory is a **client-side only** Vite + React game (no backend server to run). It runs
fully in the browser in "local mode" using `localStorage` — all `VITE_*` env vars
(Supabase, Mapbox) are optional, so no secrets are required to develop, test, or run it.

### Running / testing (standard commands live in `package.json` and `QUALITY.md`)

- Dev server: `npm run dev` (Vite, serves on `http://localhost:5173`, bound to `0.0.0.0`).
- Lint / unit / build: `npm run lint`, `npm run test:unit`, `npm run build`.
- E2E: `npm run test:e2e` (Playwright auto-starts its own dev server on port 5173 and reuses an existing one).

### Non-obvious gotchas

- After `npm install` in this environment, the `node_modules/.bin/*` shims can be created
  **without the execute bit**, so `npm run lint`, `npm run test:unit`, etc. fail with
  `sh: 1: <tool>: Permission denied`. Fix (already handled by the startup update script):
  `chmod -R +x node_modules/.bin`. `npm run build` is unaffected because it invokes
  `node node_modules/vite/bin/vite.js` directly.
- Playwright needs the Chromium browser downloaded first (`npx playwright install chromium`);
  the startup update script handles this.
- E2E demo claim code for the "Union Depot Ghost" adventure is `DEPOTGHOST` (canonical in `seed.js`).
- `npm run check:cycles` intentionally exits non-zero (~21 known `seed.js` hub cycles) — it is a
  report, not a gate. `check:all` excludes E2E.
- Never commit `dist/` (gitignored) — source-only commits.
