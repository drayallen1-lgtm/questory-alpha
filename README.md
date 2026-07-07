# Questory

A persistent, living exploration platform where players collectively discover the real world.

Questory is **not** a GPS treasure-hunting app. The real world is the game board — cities evolve, players shape exploration, and the world changes over time.

**Stack:** React · Vite · Mapbox · Supabase (optional)

---

## Documentation

Every developer and AI session starts here:

| Document | Purpose |
|----------|---------|
| [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) | Vision, philosophy, design rules |
| [ROADMAP.md](./ROADMAP.md) | Canonical phase roadmap |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engine responsibilities and data flow |
| [ENGINE_INDEX.md](./ENGINE_INDEX.md) | Alphabetical engine catalog |
| [KNOWN_PATTERNS.md](./KNOWN_PATTERNS.md) | Recurring architectural patterns |
| [AI_WORKFLOW.md](./AI_WORKFLOW.md) | Mandatory AI/developer workflow |
| [QUALITY.md](./QUALITY.md) | Tests, lint, Dev Dashboard, static checks |
| [QUESTORY_HISTORY.md](./QUESTORY_HISTORY.md) | Major milestones and why they mattered |
| [MAP_FIRST_ARCHITECTURE.md](./MAP_FIRST_ARCHITECTURE.md) | V2 map-first rebuild (15 commits) |
| [WORLD_SYSTEM.md](./WORLD_SYSTEM.md) | Living world shell, layers, floating UI |
| [UX_GUIDELINES.md](./UX_GUIDELINES.md) | V2 visual and interaction standards |

---

## Architecture Overview

```
seed.js (state root)
    ↓
Engines (pure JS — snapshots + transitions)
    ↓
React panels + Map layers
    ↓
claimFlow.js (victory orchestrator)
```

**Platform pillars:** Living World · Social Discovery · Questory Identity · Codex · Economy · Progression · Crafting · Living Earth · Creator Economy · Marketplace · AI NPCs · Dynamic Story · **Factions & Territories** · **AI Director** · **Payments & Partners** · **Open Platform**

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full engine map.

---

## Current Roadmap

| Phase | Status |
|-------|--------|
| 1 — Adventure Platform | ✓ Complete |
| 2 — Living World | ✓ Complete |
| 3 — Reactive Events | ✓ Complete |
| 4 — Social Discovery | ✓ Complete |
| 5 — Questory Identity | ✓ Complete |
| 6 — Discovered World | ✓ Complete |
| 7 — Explorer Economy | ✓ Complete |
| 8 — Player Progression | ✓ Complete |
| 9 — Crafting & Inventory | ✓ Complete |
| 10 — Legendary Hunts Evolution | ✓ Complete |
| 11 — Living Earth | ✓ Complete |
| 12 — Creator Economy | ✓ Complete |
| 13 — Global Marketplace | ✓ Complete |
| 14 — AI Living NPCs & Dynamic Story | ✓ Complete |
| 14.5 — Developer Experience & Quality | ✓ Complete |
| 14.75 — Engine Hardening | ✓ Complete |
| 15 — Factions, Guilds & Territory Wars | ✓ Complete |
| 16 — Questory AI Director | ✓ Complete |
| 17 — Real Economy, Payments & Partners | ✓ Complete |
| 18 — Open Questory Platform | ✓ Complete |
| **V2 — Map-First Living World** | ✓ Complete |

Full roadmap: [ROADMAP.md](./ROADMAP.md) · V2 details: [MAP_FIRST_ARCHITECTURE.md](./MAP_FIRST_ARCHITECTURE.md)

---

## Quality & Testing

See [QUALITY.md](./QUALITY.md) for the full guide.

| Command | Purpose |
|---------|---------|
| `npm run test:unit` | Vitest engine unit tests |
| `npm run test:e2e` | Playwright end-to-end flows |
| `npm run lint` | ESLint (gentle — undefined vars, unused imports) |
| `npm run check:cycles` | Circular dependency report (`madge`) |
| `npm run check:exports` | Unused exports (`knip`) |
| `npm run check:all` | Build + lint + unit tests + cycle check |

**Dev Dashboard:** Admin → **Dev Health** (visible in dev mode or for admin users). Runs engine health checks and state inspection without mutating gameplay.

---

## Getting Started

### Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Environment variables

Copy `.env.example` to `.env`. All variables are optional for local dev.

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_MAPBOX_TOKEN` | Live Mapbox maps |

Without Supabase, the app runs in **local mode** using `localStorage` key `questoryAlpha`.

### Build

```bash
npm run build
```

Output goes to `dist/` — **never commit dist/**.

---

## Development Rules

1. Read [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) before coding
2. Reuse existing engines — check [ENGINE_INDEX.md](./ENGINE_INDEX.md)
3. Run `npm run build` before every commit
4. Commit source only — never `dist/`
5. Extend engines — do not rewrite stable systems
6. Follow the canonical [ROADMAP.md](./ROADMAP.md) — do not invent phases

Full workflow: [AI_WORKFLOW.md](./AI_WORKFLOW.md)

---

## Deploy to Vercel

1. Push to GitHub and import in [Vercel](https://vercel.com)
2. Confirm build command: `npm run build`, output: `dist`
3. Set `VITE_*` environment variables for Production
4. `vercel.json` configures SPA fallback rewrites

### Supabase setup

1. Run migrations in `supabase/migrations/`
2. Enable Email + Google auth
3. Set redirect URLs to your Vercel domain and `http://localhost:5173`

---

## Demo

- **Claim code:** `PARSONS128` (after completing all clues in The Parsons Gold Rush)
- **First adventure:** The Hidden Ledger — Parsons, Kansas

---

## What's Included

- Mobile-first design with bottom navigation
- Adventure map with cluster/category blossom, fog of war, living world layers
- GPS check-in, finder mode, AR scenes, branching paths
- Questory Passport — collections, codex, economy, progression, crafting, rewards
- Admin review workflow and adventure creator
- Supabase auth (email + Google) when configured
