# Questory History

> Major milestones and why each phase mattered. Not code — history.

**Related documents:** [ROADMAP.md](./ROADMAP.md) · [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Table of Contents

1. [Alpha Origins](#alpha-origins)
2. [Map Era](#map-era)
3. [Living Platform](#living-platform)
4. [Questory 2.0 Economy Pillar](#questory-20-economy-pillar)
5. [Timeline Summary](#timeline-summary)

---

## Alpha Origins

### Adventure Engine

Questory began as a real-world adventure prototype: GPS clues, secret codes, sponsor hunts, and a reward vault. The core loop was **find clues → reach the treasure → claim rewards**.

**Why it mattered:** Proved that location-based narrative could work as a product, not just a demo.

---

### Discovery Bloom

Map interactions evolved from simple pins to **cluster blossom** and **category blossom** — players tap clusters, categories expand, individual adventures bloom into view.

**Why it mattered:** The map gained spatial intelligence and visual delight. Questory stopped looking like a pin list.

---

## Map Era

### Map Visual Language (Phase 1A / 1B)

Stacked pin types, overlays, spatial clustering, camera fixes, and spiderfy replacement with adventure pickers stabilized the production map architecture.

**Why it mattered:** Map UX became reliable enough for daily use — the foundation everything else builds on.

---

### Map Polish & Discovery

Fog of war, pin categories, filters, first-discoverer records, and discovery trails turned the map into an exploration surface.

**Why it mattered:** Players could *clear* the world, not just visit points.

---

## Living Platform

### Living World (Phase 2)

Discovery heat, simulated explorers, timeline pulses, and heat zones made the map feel inhabited.

**Why it mattered:** The world appeared to breathe even when the player was alone.

---

### Reactive Events (Phase 3)

Seasonal overlays, scheduled world events, limited relics, and community milestones tied real-world time to gameplay.

**Why it mattered:** Questory gained temporal depth — the world changes on a calendar.

---

### Social Discovery (Phase 4)

Guilds, territories, live races, activity feeds, and city completion metrics connected players to each other.

**Why it mattered:** Exploration became a shared sport, not a solo walk.

---

### Questory Identity (Phase 5)

Global seasons, world boss scaffold, creator worlds, sponsored campaigns, hall of fame, and city identity layers gave players a platform persona.

**Why it mattered:** Players weren't just completing hunts — they were building a Questory legacy.

---

### Discovered World (Phase 6)

Geographic discovery from neighborhood to planet, fog tiers, completion percentages, and global community goals.

**Why it mattered:** Progress became measurable at every scale — from one block to the entire Earth.

---

## Questory 2.0 Economy Pillar

Questory evolved from an adventure app into a **persistent exploration platform**. The 2.0 sequence was deliberately ordered to bind existing systems before adding new ones.

### Questory Codex

A read-only archive recording every creature, relic, NPC, landmark, season, and collection — the platform's memory.

**Why it mattered:** Scattered discoveries became a unified journal. The Pokédex moment.

---

### Explorer Economy (Phase 7)

Coins, relics, ancient keys, treasure maps, world shards, crafting materials, boss loot, and seasonal tokens.

**Why it mattered:** Discoveries gained material value that persists across hunts.

---

### Player Progression (Phase 8)

Explorer level, treasure hunter rank, cartographer rank, Parsons/creator/guild reputation, season rank, milestones.

**Why it mattered:** Players gained identity — "Explorer Lv. 47" is a statement, not a stat.

---

### Crafting (Phase 9)

Materials combine into permanent artifacts — Explorer Compass (+discovery radius), Fog Lens (+fog reveal), Rail Token.

**Why it mattered:** Economy materials became meaningful upgrades that change how you explore forever.

---

### Legendary Hunts (Phase 10)

World bosses awaken with community progress bars, live map atmosphere, global alerts, and multi-stage hunts. Six bosses: Black Lantern, Iron Conductor, River Sentinel, Hollow King, Forgotten Miner, Chapel Keeper.

**Why it mattered:** The world now occasionally demands the player's attention — the living endgame arrived.

---

### Living Earth (Phase 11)

Zooming out to continent/world level morphs the map into a rotating globe. Discovery tiers color continents. World bosses emit purple beacons. A discovery stream shows live global activity. Zooming back in returns seamlessly to QuestoryMap — no loading screens.

**Why it mattered:** Earth became Questory's overworld — exploration feels planetary, not cartographic.

---

### Creator Economy (Phase 12)

Creators earn followers, subscriptions, and simulated revenue. Premium adventures, a creator store, analytics dashboards, verification tiers, and reputation scores extend the existing economy without replacing it. Creator activity flows into Living World, Earth, and Social timelines.

**Why it mattered:** Questory became a creator platform — players can follow builders like streamers, and creators can grow worlds with data.

---

### Global Marketplace (Phase 13)

Players buy, sell, trade, and auction items across a dynamic marketplace. Inventory unifies relics, materials, boss loot, and creator collectibles. Auctions, wishlists, trade reputation, and hall of fame rankings make the exploration economy tangible.

**Why it mattered:** Questory became a full exploration economy — wealth and collection now live inside the world.

---

### AI Living NPCs & Dynamic Story (Phase 14)

NPCs gained long-term memory, relationship labels (Stranger → Legendary Bond), deterministic dynamic dialogue reacting to reputation/boss/market/season state, lightweight quest hooks, six canonical story arcs, Codex memory archives, and AI-ready prompt payloads — all without external API calls.

**Why it mattered:** Story characters now feel alive across adventures and systems, preparing Questory for future AI dialogue while staying deterministic and safe today.

---

### Developer Experience & Quality (Phase 14.5)

Vitest unit tests for core engines, Playwright E2E smoke/adventure/map/passport flows, a Developer Dashboard with engine health checks and state inspection, and gentle static analysis (ESLint, Knip, Madge). See [QUALITY.md](./QUALITY.md).

**Why it mattered:** Automated protection before Phase 15 — claim, branching, progression, marketplace, and NPC regressions surface in CI/local runs without gameplay changes.

---

### Engine Hardening (Phase 14.75)

Import cycle reduction via `timelineCore`, `mapCoordinates`, and `messageUtils`; dev-only snapshot freezing via `engineSnapshotUtils`; expanded tests; Dev Health state-size and timing metrics; lazy-loaded Codex/Living Earth/Dev panels; duplicate map timer removed.

**Why it mattered:** Stabilized the engine hub and observability without adding gameplay systems — safer foundation for Phase 15.

---

### Dynamic Factions, Guilds & Territory Wars (Phase 15)

Faction engine with guild identity, territory influence, wars UI, map overlays, Living World / Earth integration, marketplace modifiers, NPC faction context, and dev health probe.

**Why it mattered:** Teams became map-scale powers — Parsons feels politically contested without replacing social or living world systems.

---

### Questory AI Director (Phase 16)

Deterministic director engine observing all major world systems; ranks opportunities, saves drafts only, feeds Living World / Earth timelines, suggests NPC hooks, and builds sanitized AI prompt payloads. Admin AI Director panel and unit tests.

**Why it mattered:** Questory can recommend what happens next in the world safely — orchestration without replacing engines or mutating gameplay automatically.

---

### Real Economy, Payments & Partner Operations (Phase 17)

Simulated payment engine with wallets, payouts, settlements, partner campaigns, compliance, and risk detection. Stripe Connect readiness without live transfers. Admin Payments, Partner Dashboard, Passport Wallet tab.

**Why it mattered:** Questory is architecturally ready for real commerce — creators, partners, and sponsors can be onboarded when Stripe goes live.

---

### Open Questory Platform (Phase 18)

Versioned Platform API, Questory SDK, event bus, draft webhooks, white-label brand packs, adventure templates, extension registry, enterprise orgs, Platform Console, and Developer Portal. No live integrations.

**Why it mattered:** Questory can power white-label city, museum, and enterprise apps from one engine stack.

---

## Timeline Summary

| Era | Milestone | Phase |
|-----|-----------|-------|
| Alpha | Adventure engine, vault, GPS, admin | 1 |
| Alpha | Discovery bloom, map polish | 1–2 |
| Platform | Living world, heat, fog, timeline | 2 |
| Platform | Reactive events, seasonal overlays | 3 |
| Platform | Social discovery, guilds, territories | 4 |
| Platform | Questory identity, seasons, boss | 5 |
| Platform | Discovered world, geographic levels | 6 |
| 2.0 | Codex archive | Pre-7 |
| 2.0 | Explorer economy | 7 |
| 2.0 | Player progression | 8 |
| 2.0 | Crafting & inventory | 9 |
| 2.0 | Legendary hunts & world events | 10 |
| 2.0 | Living Earth global exploration platform | 11 |
| 2.0 | Creator economy & dashboards | 12 |
| 2.0 | Global marketplace & trading network | 13 |
| 2.0 | AI Living NPCs & dynamic story engine | 14 |
| 2.0 | Developer experience & quality safeguards | 14.5 |
| 2.0 | Engine hardening & stabilization | 14.75 |
| 2.0 | Dynamic factions, guilds & territory wars | 15 |
| 2.0 | Questory AI Director | 16 |
| 2.0 | Real economy, payments & partner operations | 17 |
| 2.0 | Open Questory Platform | 18 |
| Next | Questory Intelligence Network | 19 |

---

*History explains intent. [ROADMAP.md](./ROADMAP.md) explains what's next.*
