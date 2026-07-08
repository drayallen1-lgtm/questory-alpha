# HUD Guide

The floating HUD (`FloatingHud` + `AdaptiveHudStrip` + `FloatingCard`) is the primary world interface on the map screen.

## Structure

```
FloatingHud
├── SmartNotificationStack   (inline one-line; market notifs focus the venue pin)
├── AdaptiveHudStrip           (single focus chip: walking, driving, guild war, adventure)
├── map-first-market-chip      (compact "🏪 Market nearby" when activity is near)
└── floating-hud-grid          (collapsed behind "Layers" by default)
    └── FloatingCard × N       (explorer, guild, earth, … — never marketplace)
```

> **Marketplace is a world layer, not a permanent HUD stack.** It surfaces as map pins (`MarketVenueLayer`) + a venue preview card (`MarketVenueCard`) + the compact "Market nearby" chip. `filterCardsForMapFirst` removes the marketplace deck card in map-first mode.

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
| `adaptiveHud.css` | Strip styling |
