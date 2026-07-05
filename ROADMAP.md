# Questory Roadmap

> Canonical development roadmap. Future phases extend this document — **never invent new phases without explicit instruction.**

**Related documents:** [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [QUESTORY_HISTORY.md](./QUESTORY_HISTORY.md)

---

## Table of Contents

1. [Completed Phases](#completed-phases)
2. [Future Phases](#future-phases)
3. [Roadmap Rules](#roadmap-rules)

---

## Completed Phases

### Phase 1 — Adventure Platform ✓ Complete

GPS clues, claim methods, reward vault, admin workflow, Mapbox map, sponsor hunts, finder mode, AR scenes, branching paths, engagement (badges, streaks, collections).

**Why it mattered:** Established the core hunt → claim → reward loop.

---

### Phase 2 — Living World ✓ Complete

Discovery heat, explorer simulation, fog of war, map timeline, living cluster blossom, category/adventure blossom interactions.

**Why it mattered:** The map stopped being static — it breathes.

---

### Phase 3 — Reactive Events ✓ Complete

Seasonal overlays, world events, limited relics, event-driven weather and coin bonuses, community milestones.

**Why it mattered:** The world responds to time and community activity.

---

### Phase 4 — Social Discovery ✓ Complete

Guilds, territories, live races, activity feeds, city completion, social map layers.

**Why it mattered:** Exploration became shared, not solitary.

---

### Phase 5 — Questory Identity ✓ Complete

Global seasons, world boss scaffold, creator worlds, sponsored campaigns, hall of fame, city completion identity, AR reveal markers.

**Why it mattered:** Players gained a platform identity beyond individual hunts.

---

### Phase 6 — Discovered World ✓ Complete

Geographic discovery levels (neighborhood → world), fog tiers, completion percentages, first-discoverer records, global goals, national passport.

**Why it mattered:** Exploration progress became measurable at every geographic scale.

---

### Phase 7 — Explorer Economy ✓ Complete

Persistent currencies (coins, relics, ancient keys, treasure maps, world shards, crafting materials, boss loot, seasonal tokens), relic inventory, wealth index.

**Why it mattered:** Discoveries gained long-term material value.

---

### Phase 8 — Player Progression ✓ Complete

Explorer level, treasure hunter rank, cartographer rank, Parsons/creator/guild reputation, season rank, milestones, level-up detection.

**Why it mattered:** Players gained identity and long-term goals.

---

### Phase 9 — Crafting & Inventory ✓ Complete

Recipe catalog, material spending ledger, crafted artifacts, permanent bonuses (discovery radius, fog reveal radius), Passport Craft tab.

**Why it mattered:** Economy materials became meaningful permanent upgrades.

---

### Phase 10 — Legendary Hunts & World Events Evolution ✓ Complete

World boss spawn engine, six legendary bosses, community progress, multi-stage hunts, live map atmosphere, global alert banners, legendary hunt panel, live races, claim/victory hooks, codex boss entries, crafting requirements, AR finale.

**Why it mattered:** The world now demands attention — legendary hunts became the living endgame.

---

### Phase 11 — Living Earth ✓ Complete

Globe presentation layer at continent/world zoom. Rotating Earth with day/night, clouds, discovery-colored continents, world HUD, discovery stream pulses, boss beacons, creator world markers, global goals panel, seasonal atmosphere, and smooth fly-to back into QuestoryMap.

**Why it mattered:** Questory stopped feeling like a flat map — Earth became the overworld for global exploration.

---

### Phase 12 — Creator Economy ✓ Complete

Creator economy engine, profiles, followers, subscriptions, premium adventure tiers, simulated store, analytics dashboard, verification badges, reputation scoring, map pin overlays, Passport Creators tab, and Living World / Earth / Social timeline integration.

**Why it mattered:** Questory became a creator platform — builders can grow audiences, earn simulated revenue, and own worlds.

---

### Phase 13 — Global Marketplace & Trading Network ✓ Complete

Marketplace engine with dynamic pricing, unified inventory, listings, offers, trades, auctions, wishlists, creator store, hall of fame, map venue HUD, Passport Market tab, and Living World / Earth / Social market activity feeds.

**Why it mattered:** Questory gained an exploration economy backbone — players can buy, sell, trade, and auction inside the world.

---

### Phase 14 — AI Living NPCs & Dynamic Story Engine ✓ Complete

AI-ready NPC memory engine with long-term relationships, deterministic dynamic dialogue, quest hooks, story arcs (Black Lantern, Iron Conductor, River Sentinel, Founder Trail, Horror Crest, Parsons Heritage), enhanced NPC play cards, Codex memory entries, and Living World timeline integration.

**Why it mattered:** NPCs now feel like living characters who remember the player, react to bosses/market/season events, and advance personal story arcs — without real AI API calls yet.

---

### Phase 14.5 — Developer Experience & Quality ✓ Complete

Vitest engine unit tests, Playwright E2E smoke flows, a dev-only Developer Dashboard (engine health + state inspector), and gentle static analysis (ESLint, Knip, Madge). Documented in [QUALITY.md](./QUALITY.md).

**Why it mattered:** Questory gained automated safeguards before Phase 15 — regressions in claim flow, branching, progression, marketplace, and NPC engines are caught early without changing gameplay.

---

## Future Phases

### Phase 15 — Dynamic Factions, Guilds & Territory Wars

Faction allegiance, guild territory control, regional conflicts, and map-scale social competition layered on top of exploration.

**Status:** Future

---

## Roadmap Rules

1. **This file is canonical.** Do not add Phase 16+ without explicit product direction.
2. **Completed phases stay checked off.** Do not un-complete work.
3. **In-progress means actively being built** — move to complete only when committed and buildable.
4. **Future phases are ordered by dependency**, not by excitement.
5. **Every phase must plug into existing pillars** — see [PROJECT_CONSTITUTION.md §4](./PROJECT_CONSTITUTION.md#4-design-rules).

---

*Last updated: Phase 14.5 complete. Next milestone: Phase 15 — Dynamic Factions, Guilds & Territory Wars.*
