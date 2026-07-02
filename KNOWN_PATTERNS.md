# Questory Known Patterns

> Recurring architectural patterns. Future AI and developers should follow these — not invent new ones.

**Related documents:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [ENGINE_INDEX.md](./ENGINE_INDEX.md) · [AI_WORKFLOW.md](./AI_WORKFLOW.md)

---

## Table of Contents

1. [The Questory Stack](#the-questory-stack)
2. [Engine Pattern](#engine-pattern)
3. [Snapshot Pattern](#snapshot-pattern)
4. [UI Panel Pattern](#ui-panel-pattern)
5. [Map Layer Pattern](#map-layer-pattern)
6. [Victory Hook Pattern](#victory-hook-pattern)
7. [World Update Pattern](#world-update-pattern)
8. [State Normalization Pattern](#state-normalization-pattern)
9. [Vault Tab Pattern](#vault-tab-pattern)
10. [Anti-Patterns](#anti-patterns)

---

## The Questory Stack

Every feature typically flows through this stack:

```
Engine
  ↓
Snapshot
  ↓
React Panel (or Map Layer)
  ↓
Claim Flow Hook (if completion-related)
  ↓
State Update → persist
  ↓
Living World reflects change
```

---

## Engine Pattern

**Location:** `src/*Engine.js` or dedicated module (`claimFlow.js`, `finderMode.js`)

**Rules:**
- Pure functions — no React, no DOM, no side effects except returning new state
- Export constants for limits, tiers, catalogs
- Export `normalizeX(raw)` for state slice validation
- Export `getXSnapshot(state, adventures, options)` for read paths
- Export `applyX(state, ...)` or `recordX(state, ...)` for write paths

**Example:**

```javascript
// playerProgressionEngine.js
export function normalizePlayerProgression(raw) { ... }
export function getPlayerProgressionSnapshot(state, adventures) { ... }
export function applyProgressionOnVictory(state, adventure, context) { ... }
```

**When creating a new engine:** add entry to [ENGINE_INDEX.md](./ENGINE_INDEX.md).

---

## Snapshot Pattern

**Purpose:** Compute a read-only view from state + adventures for UI rendering.

**Rules:**
- One snapshot function per engine (`getCodexSnapshot`, `getCraftingSnapshot`, etc.)
- Snapshots are derived — never stored separately
- UI calls snapshot inside `useMemo([state, adventures])`
- Snapshots can pull from other engines (composition, not duplication)

**Example:**

```javascript
// CraftingUI.jsx
const snapshot = useMemo(
  () => getCraftingSnapshot(state, adventures),
  [state, adventures]
);
```

**Data flow:**

```
state + adventures
    → getXSnapshot()
    → { recipes, bonuses, stats, ... }
    → React renders cards/grids
```

---

## UI Panel Pattern

**Location:** `src/*UI.jsx` or `*Panel.jsx`

**Rules:**
- One panel component per vault tab or major screen section
- Import snapshot function from engine — no business logic in JSX
- Use existing card/progress/chip CSS conventions
- Pair with dedicated `*.css` file for feature styles
- Import CSS in `main.jsx`

**Structure:**

```jsx
export function XPanel({ state, adventures, setState }) {
  const snapshot = useMemo(() => getXSnapshot(state, adventures), [state, adventures]);
  return (
    <div className="x-panel">
      <div className="card">...</div>
    </div>
  );
}
```

**Home cards:** smaller snapshot-driven widgets (`PlayerProgressionHomeCard`, `SeasonRankCard`) link to vault tabs via `nav('vault', null, { tab: 'progression' })`.

---

## Map Layer Pattern

**Location:** `src/*Layer.jsx` consumed by `QuestoryMap.jsx`

**Rules:**
- Layer receives snapshot data as props from parent
- GeoJSON built in engine or map utility — not in layer JSX
- Layers are additive — don't replace base pin layer
- Use `mapDiscovery.js` for pin visuals and fog geometry

**Examples:**
- `LivingWorldLayer.jsx` — heat, explorers, pulses
- `TerritoryLayer.jsx` — guild territories
- `SocialRaceLayer.jsx` — live race markers
- `WorldBossLayer.jsx` — boss markers
- `CityDiscoveryRingLayer.jsx` — discovery rings

**Flow:**

```
livingWorldEngine.getLivingWorldSnapshot()
    → QuestoryMap passes to LivingWorldLayer
    → Mapbox source/layer updated
```

---

## Victory Hook Pattern

**Location:** `claimFlow.js` → `buildClaimSuccessState`

**Rules:**
- All hunt completion side effects chain through `claimFlow.js`
- Individual engines export single-responsibility hooks (`applyProgressionOnVictory`, `unlockLoreOnVictory`)
- `claimFlow` calls hooks in sequence, passing updated state forward
- Never add completion logic directly in React event handlers

**Hook chain (current):**

```
buildClaimSuccessState()
  → applyAdventureCompletion      (engagement)
  → applySeasonalProgress         (economy)
  → addSeasonPoints               (social)
  → applyExpansionOnCompletion    (expansion)
  → applyGrowthOnCompletion       (growth)
  → applyEndingRewards            (world)
  → unlockLoreOnVictory           (lore)
  → recordWorldEventVictory       (events)
  → recordLivingNpcVictory        (NPCs)
  → recordAiNpcVictory            (AI NPC memory)
  → resolveStoryBeatForAdventure  (dynamic story)
  → applyBranchVictoryEffects     (branching)
  → applyProgressionOnVictory     (progression)
```

**Adding a new completion effect:**
1. Export `applyXOnVictory(state, adventure, context)` from your engine
2. Import and call it in `claimFlow.js`
3. Do NOT create a second claim orchestrator

---

## World Update Pattern

**Purpose:** Player actions ripple into the living map.

**Triggers → Updates:**

| Player action | Engine write | Map/living world effect |
|---------------|-------------|-------------------------|
| Complete hunt | `recordMapReveal` | Fog clears around adventure |
| Complete hunt | `recordSocialMapActivity` | Activity feed entry |
| Complete hunt | Heat recomputed | Pin heat level changes |
| Craft artifact | `craftArtifact` | Finder radius widens |
| Complete hunt | `recordAiNpcVictory` | NPC memory + story arc beat |
| NPC dialogue choice | `recordNpcChoice` (aiNpc) | Trust/relationship shifts |
| Boss active | `getAiNpcSnapshot` | NPC dialogue + timeline reactions |
| Daily login | `applyDailyLogin` | Streak, coins |
| Join event | `joinCityEvent` | Event badge progress |

**Rules:**
- Map reads from state snapshots — it does not store its own progress
- Fog, heat, and timeline are derived from `state.mapExploration`, adventures, and events
- Living world snapshot recomputes on every render cycle via `useMemo`

---

## AI NPC Extension Pattern (Phase 14)

**Purpose:** Extend `livingNpcEngine` without replacing it.

**Rules:**
- `livingNpcEngine` owns per-adventure dialogue seen/trust basics
- `aiNpcEngine` owns long-term memory, relationships, dynamic lines, quest hooks
- `recordNpcChoice` in `aiNpcEngine` delegates to `livingNpcEngine` then enriches `state.aiNpc`
- UI uses `EnhancedLivingNpcCard` which wraps existing presentation from `resolveLivingNpcPresentation`
- `buildNpcPromptPayload` prepares future API calls — never call external AI from engines yet
- Deterministic guardrails: no private player data, no lore contradictions, canonical arc facts preserved

**Read path:**

```
getAiNpcSnapshot(state, adventures)
  → generateNpcDialogue / generateNpcQuestHook
  → AiNpcUI / Codex / Living World timeline
```

---

## State Normalization Pattern

**Location:** `seed.js`

**Every state slice follows:**

```javascript
// In engine:
export const DEFAULT_X = { ... };
export function normalizeX(raw) { ... }

// In seed.js defaultState:
x: { ...DEFAULT_X },

// In seed.js loadState:
x: normalizeX(saved.x),
```

**Rules:**
- Never trust localStorage shape — always normalize
- Arrays get `.slice(0, LIMIT)` to prevent unbounded growth
- Numbers get `Math.max(0, Number(x) || 0)`
- New slices require all three: DEFAULT, normalize, defaultState entry

---

## Vault Tab Pattern

**Location:** `SweepUI.jsx` → `QuestoryPassport`

**Adding a new vault tab:**

1. Add tab button in `vault-tabs-scroll`
2. Add `{tab === 'name' && <XPanel ... />}` block
3. Exclude from balance card if full-width panel: `tab !== 'economy' && tab !== 'progression' && ...`
4. Support deep link: `nav('vault', null, { tab: 'name' })` sets `state.vaultTab`
5. Sync tab from state in `useEffect`

**Current tabs:** passport, codex, economy, progression, crafting, rewards, badges

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|--------------|------------------|
| Business logic in React components | Move to engine, use snapshot |
| Second claim orchestrator | Extend `claimFlow.js` |
| Storing snapshot data in state | Compute snapshots on read |
| New currency system | Extend `economy.js` or `explorerEconomyEngine.js` |
| `progressionEngine` for player XP | Use `playerProgressionEngine.js` |
| Duplicating material counts | Use `getExplorerEconomySnapshot` + spent ledger |
| Rewriting map pin system | Extend `mapDiscovery.js` |
| Committing `dist/` | Source-only commits |
| New roadmap phase without approval | Extend [ROADMAP.md](./ROADMAP.md) only when directed |

---

*Patterns are conventions that kept Questory scalable. Follow them.*
