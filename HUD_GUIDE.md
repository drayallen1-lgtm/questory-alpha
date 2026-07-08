# HUD Guide

The floating HUD (`FloatingHud` + `AdaptiveHudStrip` + `MicroHudStrip` + `WorldRadialMenu`) is the primary world interface on the map screen.

## Structure (Living Atlas)

```
FloatingHud
├── MicroHudStrip              (compact chips: ⚠ legendary, 💎 drop, 🔨 auction — auto-hide, expand on tap)
├── AmbientDirectorWhisper     (single drifting whisper; no stacked banners)
├── AdaptiveHudStrip           (context: walking, driving, adventure)
├── map-first-market-chip      (compact "🏪 Market nearby")
├── WorldRadialMenu            (🌎 bloom → Treasure, Market, Guild, Earth, Layers, Compass)
└── floating-hud-grid          (Layers deck — collapsed by default)
    └── FloatingCard × N
```

> **No "World" dock tab.** Opening Questory lands on the map. The dock is Feed · Passport · Social · Create · Admin.

> **Marketplace is a world layer, not a permanent HUD stack.** Map pins + venue card + compact chip. Giant notification banners are hidden in atlas mode.

## Adaptive modes

Resolved by `adaptiveHudEngine.resolveHudMode`:

| Mode | Trigger | Strip focus |
|------|---------|-------------|
| Walking | Street zoom | Treasure, compass, distance |
| Driving | Regional zoom | Regions, legends |
| Guild war | Contested territory | Territory, score |
| Adventure | Play screen | Clues, timer, progress |

## Card layout pattern

Every major surface follows **Overview → Details → History → Actions**:

- **Summary row** — icon, title, metric (overview)
- **Expanded body** — list items (details/history)
- **View All** — navigates to full screen (actions)

Empty cards use story CTAs from `enrichCardsWithEmptyStates`.

## Analytics

HUD interactions increment `state.worldAnalytics.counters`:

- `card_expand`, `card_view_all`, `notification_open`, `marketplace_visit`

## Performance

Dev Health warns when HUD card count or refresh time exceeds thresholds (`worldExperienceEngine.PERFORMANCE_THRESHOLDS`).

## Files

| File | Role |
|------|------|
| `FloatingHud.jsx` | Composition + event wiring |
| `floatingCardsEngine.js` | Card data from engine snapshots |
| `adaptiveHudEngine.js` | Mode + strip + card priority |
| `FloatingCard.jsx` | Presentational card |
| `MicroHudStrip.jsx` | Compact atlas chips |
| `WorldRadialMenu.jsx` | Bloom radial for world actions |
| `livingAtlas.css` | Atlas layout + geography/building animations |
