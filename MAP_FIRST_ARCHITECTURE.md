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

### V3 Living Atlas (15-commit immersion pass)

| # | Focus | Key modules |
|---|--------|-------------|
| 1 | True World Camera | `worldCameraEngine`, remembered `state.worldCamera` |
| 2 | Geography First | `geographyLayerEngine`, `GeographyLayer` |
| 3 | Buildings Are the World | `buildingActivityEngine`, `BuildingActivityLayer` |
| 4 | Micro HUD | `microHudEngine`, `MicroHudStrip` |
| 5 | Radial World Menu | `WorldRadialMenu` |
| 6 | City Identity | `LivingCityPanel` atlas chip |
| 7–15 | Whispers, context, streets, discovery, audio | `livingStreetsEngine`, `immersiveAudioFrameworkEngine`, `livingAtlas.css` |

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
| Open app | `screen: 'map'` → WorldShell (street-block zoom, no World dock tab) |
| Tap Earth card | `nav('world')` or zoom earth mode |
| Tap guild card | `nav('social', { guildTab: 'wars' })` |
| Tap marketplace venue pin | opens venue preview card (`selectedMarketVenueId`) |
| `Market nearby` chip / merchant pulse | `nav('map', { marketplaceVenueId, marketplaceTab })` → fly-to pin + card |
| Browse Market (venue card) | `nav('marketplace', { marketplaceVenueId, marketplaceTab })` |
| Director whisper | fly-to / play / social / legendary-hunt |

## Marketplace world layer

Marketplace is a **world layer, not a permanent HUD stack**:

```
marketplaceEngine (economy state)
  ↓
marketplaceLayerEngine (venue cards: tab, liveCount, hot, boosted, items)
  ↓
MarketVenueLayer (map pins) + MarketVenueCard (preview) + FloatingHud "Market nearby" chip
  ↓
nav('marketplace', { marketplaceVenueId, marketplaceTab })
```

- `mapFirstHudEngine.filterCardsForMapFirst` strips the marketplace deck card; `resolveMarketChip` surfaces the compact chip instead.
- Venue selection state (`selectedMarketVenueId`) lives in `QuestoryMap`; setting `state.marketplaceVenueId` (chip / pulse / notification) flies the map to the pin and opens the card.
- `marketplaceEngine.js` / `marketplaceLayerEngine.js` are extended, never replaced. No live payments.

---

## End State

> *They shouldn't feel like they opened an app. They should feel like they opened a living world.*

The map is no longer a screen — it is the center of everything.

---

*See [UX_GUIDELINES.md](./UX_GUIDELINES.md) for visual and interaction standards.*
