# Questory Quality Guide

Phase 14.5 — Developer Experience & Quality safeguards for Questory before Phase 15.

## Quick commands

| Command | Purpose |
|---------|---------|
| `npm run test:unit` | Vitest engine unit tests |
| `npm run test:unit:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright end-to-end tests (starts dev server) |
| `npm run test:e2e:ui` | Playwright interactive UI |
| `npm run lint` | ESLint (undefined vars, unused import warnings) |
| `npm run check:exports` | Knip unused export scan |
| `npm run check:cycles` | Madge circular dependency report |
| `npm run check:all` | Build + lint + unit tests |
| `node scripts/audit-export-imports.mjs` | Missing import/call-site audit |

## Unit tests

Location: `tests/unit/`

Engines covered:

- `branchingEngine` — branch path commit safety
- `claimFlow` — wrong code, valid claim, duplicate block
- `worldDiscoveryEngine` — snapshot shape and percentage bounds
- `playerProgressionEngine` — XP snapshot and victory hook
- `marketplaceEngine` — snapshot load and safe purchase failure
- `aiNpcEngine` — snapshot, dialogue, relationship labels

Setup file `tests/unit/setup.js` preloads `seed.js` to avoid circular import races in Node.

## E2E tests

Location: `tests/e2e/`

| Spec | Coverage |
|------|----------|
| `smoke.spec.js` | App load, Home, Map, Passport, Feed |
| `map-flow.spec.js` | Map container and markers |
| `passport-tabs.spec.js` | Vault tab switching |
| `adventure-flow.spec.js` | Branch path + Union Depot Ghost claim (`DEPOTGHOST`) |

Playwright config:

- Mocks geolocation (Parsons, KS)
- Skips onboarding overlays via localStorage in `helpers.js`
- Single worker for stability on Windows / Mapbox
- Software GL flags for headless Chromium

First-time setup:

```bash
npx playwright install chromium
```

## Dev Dashboard

**Route:** Admin → **Dev Health** (dev mode or admin user)

**Screen id:** `dev-health`

Shows:

- Engine health cards (snapshot ok, timing ms, errors)
- State inspector (coins, level, branch path, NPC memory, boss, etc.)
- **Run Health Check** button (read-only; does not mutate gameplay state)

Files: `src/developerHealthEngine.js`, `src/DeveloperDashboard.jsx`, `src/developerDashboard.css`

## Static analysis

### ESLint

Gentle config in `eslint.config.js` — catches `no-undef` without React style rewrites.

### Knip

`knip.json` scans for unused exports. Informational; large legacy surface may report noise.

### Madge

`npm run check:cycles` reports circular dependencies in `src/`. **Known:** ~23 cycles centered on `seed.js` hub imports (documented, not blocking gameplay). Future refactors should reduce hub coupling.

### Import audit scripts

- `scripts/audit-export-imports.mjs` — exported symbols called without imports
- `scripts/audit-imports.mjs` — broader call-site heuristics

## Known limitations

- E2E claim code for Union Depot Ghost is `DEPOTGHOST` (canonical in `seed.js`).
- Map E2E uses fallback map markers when `VITE_MAPBOX_TOKEN` is unset.
- `check:cycles` exits non-zero while legacy cycles remain — use as a report, not a hard gate yet.
- `check:all` does not include E2E (run separately before release).
- Dev Dashboard adds bundle weight in dev/admin paths only; tree-shaken from typical player flow.

## Before Phase 15

1. `npm run build`
2. `npm run test:unit`
3. `npm run test:e2e`
4. `npm run lint`
5. Spot-check Dev Health in Admin

Source-only commits. Never commit `dist/`.
