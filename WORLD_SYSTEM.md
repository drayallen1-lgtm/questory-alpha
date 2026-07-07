# Questory V2 — World System

> How the living world map composes engines, layers, and floating UI.

**Related:** [MAP_FIRST_ARCHITECTURE.md](./MAP_FIRST_ARCHITECTURE.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Shell

```
WorldShell.jsx
├── LivingCityPanel      ← livingCityEngine
├── FloatingHud          ← floatingCardsEngine + adaptiveHudEngine
├── MapScreen (shell)    ← QuestoryMap.jsx
├── AmbientDirectorWhisper ← ambientWorldDirectorEngine
└── FloatingDock         ← nav tabs
```

Default landing: `state.screen === 'map'` → `WorldShell`.

---

## Progressive Layers

Managed by `progressiveWorldLayersEngine.js`. Layers fade in by zoom and context:

| Layer | ID | When visible |
|-------|-----|--------------|
| Map | base | Always |
| Cities / pins | cities | Street+ |
| Discovery | discovery | City+ |
| Explorer activity | explorer | Local |
| Marketplace | marketplace | City+ |
| Guild wars | guild | Contested / zoom |
| NPC activity | npc | Story hooks |
| Living Earth | earth | Zoom ≤ 2.5 |

`layerSnapshot` flows: `MapScreen` → `onProgressiveLayersChange` → `WorldShell` → HUD + city.

---

## Floating Cards

`floatingCardsEngine.js` builds collapsed card data:

- Explorer Activity · Territory War · Creator Hunt · Sponsor · Marketplace · Live Hunt · **Earth**

Cards respect `layerSnapshot.hudCards` visibility flags.

Earth card enriched by `livingEarthExperienceEngine.js` (city pulses, guild control, global discoveries).

---

## Adaptive HUD

`adaptiveHudEngine.js` modes:

| Mode | Trigger | Strip |
|------|---------|-------|
| World | Default | Hidden |
| Walking | Street zoom / pin selected | Treasure, Compass, Distance |
| Driving | Regional zoom | Regional scan |
| Adventure | Play / active progress | Clues, Progress, Timer |
| Guild War | Contested + guild layer | War Score, Territory, Squad |

---

## Living Earth Experience

Phase 11 engine (`livingEarthEngine.js`) + V2 experience layer (`livingEarthExperienceEngine.js`):

- Globe markers, discovery stream, boss beacons
- **City pulses** on zoom-out
- **Guild control** influence badges
- **Planet story** headline in Earth HUD

---

## Ambient World Director

`questoryAiDirectorEngine.js` — full signals (admin panel).

`ambientWorldDirectorEngine.js` — player-facing whispers on the map:

- River unexplored · Ghost rising · Guild downtown · Nearby mystery
- Rotates every ~9s; dismiss persists in `state.ambientDirector`

---

## Animations

`livingWorldAnimationsEngine.js` applies ambient classes to `map-stage` and `world-shell` based on layer activity (night, boss, contested, etc.).

Polish tokens in `worldPolish.css` unify easing, blur, and shadows.

---

## State Slices (V2)

| Key | Module |
|-----|--------|
| `ambientDirector` | `ambientWorldDirectorEngine.js` |
| `livingEarth` | `livingEarthEngine.js` |
| `aiDirector` | `questoryAiDirectorEngine.js` |
| `faction` | `factionEngine.js` |

All normalized in `seed.js` on load.

---

*The world is the product. Features are guests on the map.*
