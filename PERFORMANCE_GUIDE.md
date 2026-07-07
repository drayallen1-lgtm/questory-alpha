# Performance Guide

World performance is measured in `worldExperienceEngine.getWorldPerformanceSnapshot` and surfaced in **Dev Health**.

## Metrics

| Metric | Source | Threshold |
|--------|--------|-----------|
| HUD card count | Floating HUD | ≤ 8 |
| Visible layers | `layerSnapshot.layers` | ≤ 9 |
| Active animations | `layerSnapshot.animations` | ≤ 14 |
| HUD refresh ms | Measured in map shell | ≤ 48ms |
| Map render ms | Map stage | ≤ 150ms |
| World update ms | Layer engine tick | ≤ 80ms |

## Dev Health

`runDeveloperHealthCheck` includes a `world-performance` engine probe. Warnings appear in:

- Summary pill (`worldPerformanceWarning`)
- Inspector card (hud cards, layers, animations)

## Optimization tips

1. **Collapse cards** — Only one expanded card at a time reduces layout work.
2. **Layer gating** — `progressiveWorldLayersEngine` hides layers by zoom/mode.
3. **Memoized snapshots** — HUD cards rebuild from engine snapshots, not raw state walks.
4. **Lazy hydration** — World shell skeleton until `layerSnapshot` is ready.

## Future instrumentation

- FPS sampling via `requestAnimationFrame` loop (optional dev overlay)
- Memory estimate from `performance.memory` where available
- Playwright performance budgets in CI

## Related

- `PERFORMANCE_THRESHOLDS` in `src/worldExperienceEngine.js`
- `developerHealthEngine.js` world-performance check
