# Questory Architecture

> Engine responsibilities, data flow, and integration boundaries. **Never duplicate responsibilities.**

**Related documents:** [ENGINE_INDEX.md](./ENGINE_INDEX.md) · [KNOWN_PATTERNS.md](./KNOWN_PATTERNS.md) · [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md)

---

## Table of Contents

1. [Overview](#overview)
2. [State Model](#state-model)
3. [Platform Pillars](#platform-pillars)
4. [Adventure & Claim](#adventure--claim)
5. [Map & Discovery](#map--discovery)
6. [Living World](#living-world)
7. [Social Discovery](#social-discovery)
8. [Questory Identity](#questory-identity)
9. [Codex & Lore](#codex--lore)
10. [Economy & Crafting](#economy--crafting)
11. [Progression](#progression)
12. [Experience Layer](#experience-layer)
13. [Persistence & Sync](#persistence--sync)
14. [UI Structure](#ui-structure)
15. [Responsibility Matrix](#responsibility-matrix)

---

## Overview

Questory is a React + Vite SPA. Business logic lives in **pure JavaScript engines**. React components consume **snapshots** via `useMemo`. State mutations flow through **claim flow hooks** and **navigation handlers**.

```
seed.js (defaultState, normalize, persist)
    ↓
Engines (pure functions)
    ↓
Snapshots (read-only views)
    ↓
React panels / map layers
    ↓
User action → state transition → persist
```

---

## State Model

| Key | Module | Purpose |
|-----|--------|---------|
| `questoryAlpha` | `persistence.js` | localStorage key |
| `defaultState` | `seed.js` | Initial state shape |
| `progress` | `seed.js` | Per-adventure step, bonuses, AR, claimed |
| `engagement` | `engagement.js` | Badges, streaks, collections |
| `economy` | `economy.js` | Coin spends, hints, skips, premium |
| `explorerEconomy` | `explorerEconomyEngine.js` | Persistent currencies & materials |
| `playerProgression` | `playerProgressionEngine.js` | XP ledger, milestones seen |
| `crafting` | `craftingEngine.js` | Crafted artifacts, materials spent |
| `codex` | `codexEngine.js` | Seen entries |
| `mapExploration` | `mapDiscovery.js` | Fog reveals, first discoveries |
| `world` | `worldEngine.js` | NPC progress, discoveries, weather |
| `social` | `social.js` | Season points, teams, activity |

All slices are **normalized on load** in `seed.js`.

---

## Platform Pillars

These are the integration points every new feature must touch:

| Pillar | Primary engines | UI entry points |
|--------|-----------------|-----------------|
| Living World | `livingWorldEngine`, `livingWorldEventsEngine` | `LivingWorldLayer`, `QuestoryMap` |
| Social Discovery | `socialWorldEngine`, `social.js` | `SocialUI`, `SocialRaceLayer`, `TerritoryLayer` |
| Questory Identity | `questoryIdentityEngine`, `seasonEngine` | `QuestoryIdentityPanel`, `WorldBossLayer` |
| Codex | `codexEngine`, `loreCollectionsEngine` | `CodexUI`, Passport Codex tab |
| Economy | `economy.js`, `explorerEconomyEngine` | `EconomyUI`, `ExplorerEconomyPanel` |
| Progression | `playerProgressionEngine` | `PlayerProgressionUI`, Passport Progress tab |
| Crafting | `craftingEngine` | `CraftingUI`, Passport Craft tab |

---

## Adventure & Claim

### Adventure Engine (distributed)

Adventure data is not one monolithic engine. Responsibilities are split:

| Module | Responsibility |
|--------|----------------|
| `seed.js` | Adventure list, progress, rewards, certificates |
| `claimSystem.js` | Claim methods, validation, field config |
| `claimFlow.js` | **Victory orchestrator** — chains all completion hooks |
| `progressionEngine.js` | Clue step advancement (NOT player XP) |
| `finderMode.js` | Medallion GPS, signal strength, capture radius |
| `rewardInventory.js` | Final reward templates, vault resolution |
| `branchingEngine.js` | Path selection, branch finales |
| `arEngine.js` | AR scenes, finale playback, completion tracking |
| `adventureDirector.js` | Narrative beats, mood, chapter structure |
| `directorRuntime.js` | Runtime director clue/chapter resolution |

### claimFlow.js — Victory orchestrator

**Purpose:** Single entry point when a hunt is claimed.

**Inputs:** `state`, `adventure`, claim context

**Outputs:** Updated state with rewards, engagement, economy, lore, progression, world events, NPC records, branching effects

**Consumers:** `main.jsx` claim handlers

**Hooks chained on victory:**
- `applyAdventureCompletion` (engagement)
- `applySeasonalProgress`, `addSeasonPoints` (economy/social)
- `applyExpansionOnCompletion`, `recordArCapture` (expansion)
- `applyGrowthOnCompletion` (growth)
- `applyEndingRewards` (world)
- `unlockLoreOnVictory` (lore)
- `recordWorldEventVictory` (events)
- `recordLivingNpcVictory` (NPCs)
- `applyBranchVictoryEffects` (branching)
- `applyProgressionOnVictory` (player progression)

---

## Map & Discovery

### mapDiscovery.js

**Purpose:** Pin categories, filters, fog-of-war, map reveals, cluster helpers.

**Inputs:** `state.mapExploration`, adventure centers

**Outputs:** GeoJSON for revealed areas, filter state, `recordMapReveal`

**Consumers:** `QuestoryMap.jsx`, `mapClusterBlossom.js`, `livingWorldEngine`

### worldDiscoveryEngine.js (Phase 6)

**Purpose:** Geographic discovery levels, completion tiers, global goals, first-discoverer badges.

**Inputs:** `mapExploration`, adventures, creator worlds

**Outputs:** `getDiscoveredWorldSnapshot`, completion percentages by level

**Consumers:** `DiscoveredWorldPanel`, `CityDiscoveryRingLayer`, `codexEngine`

---

## Living World

### livingWorldEngine.js

**Purpose:** Discovery heat, simulated explorer dots, timeline pulses, heat zones.

**Inputs:** Adventures, state (heat, exploration, events)

**Outputs:** `getLivingWorldSnapshot` — explorers, pulses, timeline, heat zones

**Consumers:** `LivingWorldLayer`, `LivingWorldTimeline`, `QuestoryMap`

### livingWorldEventsEngine.js

**Purpose:** Ambient activity banners, legendary drops, visit heat, world event notifications.

**Inputs:** Adventures, event context, time of day

**Outputs:** `getLivingWorldEventsSnapshot`, notification builders

**Consumers:** `livingWorldEngine`, `WorldEventUI`, `LivingWorldActivityFeed`

### worldEventEngine.js (Phase 3)

**Purpose:** Scheduled world events, limited relics, event weather, coin multipliers, community milestones.

**Inputs:** Calendar, state, adventures

**Outputs:** `getWorldEventContext`, `recordWorldEventVictory`, event overlays

**Consumers:** Map layers, `claimFlow`, `adventureDirector`, NPC dialogue

---

## Social Discovery

### socialWorldEngine.js (Phase 4)

**Purpose:** Territories, live races, guild progress, city completion, social activity feeds.

**Inputs:** State, adventures, team definitions

**Outputs:** `getSocialDiscoverySnapshot`, territory overlays, race markers

**Consumers:** `SocialUI`, `SocialRaceLayer`, `TerritoryLayer`, `playerProgressionEngine`

### social.js

**Purpose:** Season points/tiers, teams, ghost runs, photo memories, heat computation.

**Inputs:** State, adventure progress

**Outputs:** Social mutations, leaderboard data

**Consumers:** `claimFlow`, `progressionEngine`, `socialWorldEngine`

---

## Questory Identity

### questoryIdentityEngine.js (Phase 5)

**Purpose:** Season progress, world boss state, hall of fame, sponsored campaigns, creator world visits, AR reveal markers.

**Inputs:** State, adventures, season config

**Outputs:** `getIdentitySnapshot`, boss progress, campaign banners

**Consumers:** `QuestoryIdentityPanel`, `WorldBossLayer`, `codexEngine`

### seasonEngine.js

**Purpose:** Current season definition, creator worlds catalog, world boss scaffold.

**Inputs:** Static config + adventure metadata

**Outputs:** Season badges, creator world labels

**Consumers:** `questoryIdentityEngine`, `explorerEconomyEngine`, `codexEngine`

---

## Codex & Lore

### codexEngine.js

**Purpose:** Read-only archive binding all discovery systems into categorized entries.

**Inputs:** State, adventures — pulls from lore, NPCs, discoveries, relics, AR, collections, seasons, cities

**Outputs:** `getCodexSnapshot` with categories, stats, recent unlocks

**Consumers:** `CodexUI`, Passport Codex tab

### loreCollectionsEngine.js

**Purpose:** Collection lore catalog, unlock on victory, story views, relic entries.

**Inputs:** State, adventure progress, collection completion

**Outputs:** Lore unlocks, `getAllCollectionStories`

**Consumers:** `claimFlow`, `codexEngine`, `CollectionLoreUI`

---

## Economy & Crafting

### economy.js

**Purpose:** Coin economy — hints, skips, premium unlocks, ratings, seasonal progress.

**Inputs:** State, adventure IDs

**Outputs:** Spend/purchase results, enriched rewards

**Consumers:** `claimFlow`, `EconomyUI`, adventure play UI

### explorerEconomyEngine.js (Phase 7)

**Purpose:** Persistent multi-currency inventory derived from progress and stored grants.

**Inputs:** State, adventures, lore relics, fog/completion counts

**Outputs:** `getExplorerEconomySnapshot` — wallets, materials, relic inventory

**Consumers:** `ExplorerEconomyPanel`, `craftingEngine`, `codexEngine`

### craftingEngine.js (Phase 9)

**Purpose:** Recipe catalog, material spending, crafted artifacts, permanent bonuses.

**Inputs:** State, adventures (via economy snapshot for material counts)

**Outputs:** `getCraftingSnapshot`, `craftArtifact`, radius multipliers

**Consumers:** `CraftingUI`, `finderMode.js`, `mapDiscovery.js`

---

## Progression

### playerProgressionEngine.js (Phase 8)

**Purpose:** Explorer XP/level, hunter/cartographer ranks, reputation tiers, season rank, milestones.

**Inputs:** State, adventures — aggregates from engagement, map, world, social, codex

**Outputs:** `getPlayerProgressionSnapshot`, `applyProgressionOnVictory`

**Consumers:** `PlayerProgressionUI`, `claimFlow`

### progressionEngine.js

**Purpose:** **Clue-step** advancement during play (NOT player XP).

**Inputs:** State, adventure, timing ref

**Outputs:** Next step, bonus finds, screen transitions

**Consumers:** `main.jsx` play flow

> **Naming rule:** `progressionEngine` = clue steps. `playerProgressionEngine` = player identity/XP.

---

## Experience Layer

Supporting engines for immersion — not platform pillars, but used by adventures:

| Engine | Purpose |
|--------|---------|
| `timelineEngine.js` | Cinematic timeline playback, FX timing |
| `audioTimelineEngine.js` | Adaptive audio timeline controller |
| `entityEngine.js` | AR entity spatial positions and animation state |
| `particleFxEngine.js` | Particle layer presets |
| `cameraFxEngine.js` | Camera effect CSS classes |
| `choreographyEngine.js` | Choreography action resolution |
| `cinematicAssetEngine.js` | Cinematic entity matching and scene enhancement |
| `livingNpcEngine.js` | NPC memory, trust, return-visitor dialogue |
| `worldEngine.js` | Weather, NPCs, hidden discoveries, city events, endings |
| `branchingEngine.js` | Adventure path branching |
| `arEngine.js` | AR scene normalization and completion |
| `adaptiveAudioDirector.js` | Mood-based audio direction |

---

## Persistence & Sync

| Module | Purpose |
|--------|---------|
| `persistence.js` | Load/save localStorage |
| `seed.js` | State shape, normalization, adventure seed data |
| `supabase/syncHelpers.js` | Cloud merge, daily login, remote refresh |
| `supabase/dataService.js` | Supabase CRUD |
| `draftIntegrity.js` | Local draft sync with cloud |

---

## UI Structure

| File | Role |
|------|------|
| `main.jsx` | App shell, routing (`state.screen`), play/claim flows |
| `SweepUI.jsx` | Home, passport vault tabs, feed components |
| `QuestoryMap.jsx` | Mapbox map, layers, cluster/blossom interactions |

### Passport vault tabs (`SweepUI.jsx` → `QuestoryPassport`)

Passport · Codex · Economy · Progress · Craft · Rewards · Badges

---

## Responsibility Matrix

| Concern | Owner | NOT owned by |
|---------|-------|--------------|
| Clue steps | `progressionEngine` | `playerProgressionEngine` |
| Player XP/level | `playerProgressionEngine` | `progressionEngine` |
| Coin spends | `economy.js` | `explorerEconomyEngine` |
| Persistent currencies | `explorerEconomyEngine` | `economy.js` |
| Fog reveal geometry | `mapDiscovery.js` | `worldDiscoveryEngine` |
| Geographic completion % | `worldDiscoveryEngine` | `mapDiscovery.js` |
| Victory side effects | `claimFlow.js` | Individual engines (they provide hooks, not orchestration) |
| Read-only archives | `codexEngine` | Any write path |
| Recipe crafting | `craftingEngine` | `explorerEconomyEngine` |
| Material derivation | `explorerEconomyEngine` | `craftingEngine` |
| World events schedule | `worldEventEngine` | `livingWorldEventsEngine` |
| Ambient map activity | `livingWorldEventsEngine` | `worldEventEngine` |

---

*When adding a feature, find its row in this matrix first. If another engine already owns the concern, extend that engine.*
