# Map-First Architecture

> Questory V2 — The Living World Experience (15-commit rebuild)

---

## Problem

Questory had deep engines but tab-based navigation hid the map. Players navigated **menus** instead of **places**.

## Solution

Make the map the home screen. Wrap features in a **world shell** with floating HUD, dock, and context layers.

---

## Commit Arc

| # | Focus | Key modules |
|---|--------|-------------|
| 1 | Living World Shell | `WorldShell`, `FloatingDock`, `FloatingHud`, `WorldLayout.css` |
| 2 | Progressive Layers | `progressiveWorldLayersEngine`, `ProgressiveLayer` |
| 3 | Floating Cards | `floatingCardsEngine`, `FloatingCard` |
| 4 | Living City | `livingCityEngine`, `LivingCityPanel` |
| 5 | Smart Notifications | `smartNotificationEngine`, `SmartNotificationStack` |
| 6 | Social Hub | `socialHubEngine`, consolidated Social screen |
| 7 | Guild Experience | `guildExperienceEngine`, `FactionGuildUI` |
| 8 | Marketplace Layer | `marketplaceLayerEngine`, map venues |
| 9 | Adventure Launch | `adventureLaunchEngine`, guided create |
| 10 | Sponsor Experience | `sponsorExperienceEngine` |
| 11 | Living World Animations | `livingWorldAnimationsEngine` |
| 12 | Adaptive HUD | `adaptiveHudEngine`, context strip |
| 13 | Living Earth+ | `livingEarthExperienceEngine`, city pulses |
| 14 | Ambient Director | `ambientWorldDirectorEngine`, map whispers |
| 15 | World Polish | `worldPolish.css`, E2E, docs |

---

## Data Flow

```
seed.js
  ↓
Engines (pure snapshots)
  ↓
WorldShell state (layerSnapshot, hudContext, mapFlyApi)
  ↓
MapScreen + FloatingHud + Whisper
  ↓
nav(screen, id, options) → deep-linked tabs
```

---

## Integration Rules

1. **Never replace Mapbox architecture** — presentation layers only
2. **Engine-first** — `get*Snapshot()` + `wrapEngineSnapshot`
3. **Compose in shell** — `WorldShell` / `QuestoryMap` merge snapshots
4. **Lazy heavy UI** — Living Earth overlay, Codex, Dev Dashboard
5. **Test the world** — Playwright `living-world.spec.js` covers shell, HUD, dock, mobile

---

## Entry Points

| User action | Route |
|-------------|-------|
| Open app | `screen: 'map'` → WorldShell |
| Tap Earth card | `nav('world')` or zoom earth mode |
| Tap guild card | `nav('social', { guildTab: 'wars' })` |
| Tap marketplace venue | `marketplaceVenueId` on map |
| Director whisper | fly-to / play / social / legendary-hunt |

---

## End State

> *They shouldn't feel like they opened an app. They should feel like they opened a living world.*

The map is no longer a screen — it is the center of everything.

---

*See [UX_GUIDELINES.md](./UX_GUIDELINES.md) for visual and interaction standards.*
