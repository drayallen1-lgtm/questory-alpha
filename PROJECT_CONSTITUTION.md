# Questory Project Constitution

> The permanent bible for Questory. Every developer and AI assistant reads this before writing code.

**Related documents:** [ROADMAP.md](./ROADMAP.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [AI_WORKFLOW.md](./AI_WORKFLOW.md) · [ENGINE_INDEX.md](./ENGINE_INDEX.md) · [QUESTORY_HISTORY.md](./QUESTORY_HISTORY.md) · [KNOWN_PATTERNS.md](./KNOWN_PATTERNS.md)

---

## Table of Contents

1. [Vision](#1-vision)
2. [Core Philosophy](#2-core-philosophy)
3. [Product Identity](#3-product-identity)
4. [Design Rules](#4-design-rules)
5. [Gameplay Loop](#5-gameplay-loop)
6. [Engineering Rules](#6-engineering-rules)
7. [AI Rules](#7-ai-rules)

---

## 1. Vision

### Mission

Questory is **not** a GPS treasure-hunting app.

Questory **is** a persistent, living exploration platform where players collectively discover the real world.

- **The real world is the game board.**
- **Cities evolve.**
- **Players shape exploration.**
- **The world changes over time.**

Questory turns geography, history, community, and curiosity into a long-term platform — not a one-off scavenger hunt.

---

## 2. Core Philosophy

Every feature must answer one question:

> **Does this make the world feel more alive?**

If the answer is no, **do not build it**.

Questory should feel like:

| Inspiration | What we borrow |
|-------------|----------------|
| **Pokémon GO** | Real-world movement, discovery, collection |
| **Google Earth** | Scale, geography, the planet as canvas |
| **National Treasure** | Mystery, lore, hidden history |
| **Ingress** | Territory, community, persistent map layers |
| **Ready Player One** | Wonder, legacy, shared world events |

Questory must **not** feel like:

> Google Maps with pins.

Pins are infrastructure. **Life** is the product.

---

## 3. Product Identity

Players should consistently experience these emotions:

| Emotion | Meaning in Questory |
|---------|---------------------|
| **Curiosity** | Something hidden is nearby |
| **Discovery** | The world reveals itself |
| **Progression** | My journey accumulates |
| **Community** | Others explore with me |
| **Legacy** | What I find persists |
| **Wonder** | The world responds |

Every feature — map, codex, economy, events, social, crafting — must reinforce at least one of these.

---

## 4. Design Rules

### Stability first

- **Never redesign stable systems.** Extend them.
- **Prefer evolution over replacement.**
- **No duplicate engines.** One responsibility per engine.
- **No breaking architecture.** New systems plug into existing pillars.

### Required integration points

Every new system must connect to the platform pillars:

| Pillar | Engine / module |
|--------|-----------------|
| Living World | `livingWorldEngine.js`, `livingWorldEventsEngine.js` |
| Social Discovery | `socialWorldEngine.js`, `social.js` |
| Questory Identity | `questoryIdentityEngine.js`, `seasonEngine.js` |
| Codex | `codexEngine.js`, `loreCollectionsEngine.js` |
| Economy | `economy.js`, `explorerEconomyEngine.js` |
| Progression | `playerProgressionEngine.js`, `progressionEngine.js` |
| Crafting | `craftingEngine.js` |
| Living Earth (presentation) | `livingEarthEngine.js`, `LivingEarthUI.jsx` |

If a feature cannot hook into at least one pillar, it is probably out of scope.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for engine responsibilities.

---

## 5. Gameplay Loop

The official Questory player journey:

```
Map
  ↓
Cluster
  ↓
Category Blossom
  ↓
Adventure Blossom
  ↓
Adventure Card
  ↓
Play
  ↓
Journey (clues, NPCs, AR, branches)
  ↓
Claim
  ↓
Rewards
  ↓
Codex
  ↓
Economy
  ↓
Progression
  ↓
Living World updates
```

### Loop stages

| Stage | What happens |
|-------|--------------|
| **Map** | Player sees the living map — pins, fog, heat, events |
| **Cluster** | Nearby adventures group spatially |
| **Category Blossom** | Category selection expands (horror, family, history…) |
| **Adventure Blossom** | Individual hunt revealed from cluster |
| **Adventure Card** | Detail view — sponsor, difficulty, collection, access |
| **Play** | Clue-by-clue journey with GPS, director, NPCs |
| **Journey** | Branches, bonus finds, AR scenes, finder mode |
| **Claim** | Medallion, code, or QR claim via `claimFlow.js` |
| **Rewards** | Vault items, coins, certificates, collection medallions |
| **Codex** | Discovery archived — lore, NPCs, relics, landmarks |
| **Economy** | Currencies and materials accumulate |
| **Progression** | Level, ranks, reputation, season tier advance |
| **Living World updates** | Heat, fog, timeline, events reflect player activity |

---

## 6. Engineering Rules

Always follow these rules:

| Rule | Detail |
|------|--------|
| **Build before commit** | Run `npm run build` and confirm it passes |
| **Source-only commits** | Commit `src/` and config — never `dist/` |
| **Backwards compatibility** | Normalize state on load; never break saved progress |
| **Mobile first** | Touch targets, bottom nav, responsive panels |
| **Accessibility** | Semantic HTML, readable contrast, screen-reader labels |
| **Performance** | Pure engine functions; memoized snapshots in UI |
| **No architecture rewrites** | Extend engines; do not fork parallel systems |

State persists under localStorage key `questoryAlpha` (see `seed.js` / `persistence.js`).

---

## 7. AI Rules

Every AI assistant working on Questory must:

1. **Read** [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md), [ROADMAP.md](./ROADMAP.md), and [ARCHITECTURE.md](./ARCHITECTURE.md) first.
2. **Review** existing architecture before proposing changes.
3. **Reuse** existing engines — check [ENGINE_INDEX.md](./ENGINE_INDEX.md).
4. **Avoid duplication** — never invent overlapping systems.
5. **Follow the roadmap** — do not add phases without explicit instruction. See [ROADMAP.md](./ROADMAP.md).
6. **Explain the plan** before implementing non-trivial work.
7. **Build incrementally** — small, buildable commits.
8. **Never rewrite** working systems without explicit approval.

Full workflow: [AI_WORKFLOW.md](./AI_WORKFLOW.md)

---

*This document is authoritative. When in doubt, the constitution wins.*
