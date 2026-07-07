# HUD Guide

The floating HUD (`FloatingHud` + `AdaptiveHudStrip` + `FloatingCard`) is the primary world interface on the map screen.

## Structure

```
FloatingHud
├── SmartNotificationStack   (when no card expanded)
├── AdaptiveHudStrip           (mode chips: walking, driving, guild war, adventure)
└── floating-hud-grid
    └── FloatingCard × N       (explorer, guild, marketplace, earth, …)
```

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
