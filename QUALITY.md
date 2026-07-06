# Questory Quality Guide

Phase 14.5–14.75 — Developer Experience, Quality, and Engine Hardening safeguards. Phase 15 adds faction engine tests and guild E2E coverage.

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
- `marketplaceEngine` — snapshot load, safe purchase failure, duplicate player listing block
- `aiNpcEngine` — snapshot, dialogue, relationship labels
- `dateUtils` — safe date conversion and fallbacks
- `craftingEngine` — bonus calculation from crafted artifacts
- `aiNpcEngine` (memory) — encounter and memory flag updates
- `legendaryHuntEngine` — snapshot shape and boss fields
- `factionEngine` — snapshot, territory owner, contributions, rewards, deterministic activity

Setup file `tests/unit/setup.js` preloads `seed.js` to avoid circular import races in Node.

## E2E tests

Location: `tests/e2e/`

| Spec | Coverage |
|------|----------|
| `smoke.spec.js` | App load, Home, Map, Passport, Feed |
| `map-flow.spec.js` | Map container and markers |
| `passport-tabs.spec.js` | Vault tab switching |
| `adventure-flow.spec.js` | Branch path + Union Depot Ghost claim (`DEPOTGHOST`) |
| `full-journey.spec.js` | Map → adventure → branch → claim → passport regression |
| `guilds.spec.js` | Social → Guilds hub, territory detail, rankings |

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
- State inspector (coins, level, branch path, NPC memory, boss, state size, etc.)
- Approximate saved state size with 4 MB warning threshold
- Known import cycle count (~21, seed.js hub — informational)
- Active engine errors and recent launch funnel errors
- **Run Health Check** button (read-only; branching probe does not mutate state)

Files: `src/developerHealthEngine.js`, `src/DeveloperDashboard.jsx`, `src/developerDashboard.css`, `src/engineSnapshotUtils.js`

## Engine hardening (Phase 14.75)

### Snapshot safety

Major engine snapshots use `wrapEngineSnapshot()` from `engineSnapshotUtils.js` — shallow `Object.freeze` in dev only to catch accidental mutation.

### Import cycle reduction

Standalone modules extracted where safe (no gameplay changes):

| Module | Purpose |
|--------|---------|
| `timelineCore.js` | Timeline actions + normalization (breaks horror timeline cycle) |
| `mapCoordinates.js` | Pure adventure coordinate helpers (breaks accessRules ↔ mapUtils cycle) |
| `messageUtils.js` | `safeMessage`, `REASON_MESSAGES` (breaks stability ↔ draftIntegrity cycle) |

Run `npm run check:cycles` — **~21 known cycles** remain centered on `seed.js` hub imports. Use as a report, not a hard gate.

### Lazy-loaded panels

React.lazy + Suspense for Codex, Living Earth overlay, Developer Dashboard, and screen-level Marketplace/Creator Dashboard routes. Play/adventure flow is not lazy-loaded.

### Timer audit

Removed duplicate world clock interval in `QuestoryMap.jsx` (was 60s + 180s). Other intervals retain `useEffect` cleanup.

## Static analysis

### ESLint

Gentle config in `eslint.config.js` — catches `no-undef` without React style rewrites.

### Knip

`knip.json` scans for unused exports. Informational; large legacy surface may report noise.

### Madge

`npm run check:cycles` reports circular dependencies in `src/`. **Known:** ~21 cycles centered on `seed.js` hub imports (down from ~23 after Phase 14.75 extractions). Documented, not blocking gameplay.

### Import audit scripts

- `scripts/audit-export-imports.mjs` — exported symbols called without imports
- `scripts/audit-imports.mjs` — broader call-site heuristics

## Known limitations

- E2E claim code for Union Depot Ghost is `DEPOTGHOST` (canonical in `seed.js`).
- Map E2E uses fallback map markers when `VITE_MAPBOX_TOKEN` is unset.
- `check:cycles` exits non-zero while legacy cycles remain — use as a report, not a hard gate yet.
- `check:all` does not include E2E (run separately before release).
- Knip may OOM on large repos — re-run with more memory or scan subsets if needed.
- Lazy imports for Marketplace/Creator screens are partially ineffective while those modules remain statically imported from map/passport paths — chunks still split for Codex, Living Earth, Dev Dashboard.

## Before Phase 15

1. `npm run build`
2. `npm run test:unit`
3. `npm run test:e2e`
4. `npm run lint`
5. Spot-check Dev Health in Admin

Source-only commits. Never commit `dist/`.
