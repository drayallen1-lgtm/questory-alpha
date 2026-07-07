# Animation Guide

Questory V2 motion is unified in `worldMotion.css` with tokens from `worldDesignTokens.css`.

## Easing

| Token | Use |
|-------|-----|
| `--world-ease-out` | Cards entering, HUD appear |
| `--world-ease-soft` | Hover, collapse |
| `--world-ease-bounce` | Notifications |

## Standard animations

| Animation | Class / trigger | Duration |
|-----------|-------------------|----------|
| Card expand | `.floating-card--expanded` | 0.28s |
| Card collapse | `.floating-card:not(.expanded)` | 0.2s |
| HUD enter | `.world-shell--ready .floating-hud` | 0.42s |
| Notification enter | `.floating-notification` | 0.38s |
| HUD drift | `.floating-hud-grid` | 8s loop |
| Guild pulse | `[data-layer-id='guild']` | 3.2s loop |
| Marketplace glow | `[data-layer-id='marketplace']` | 4s loop |
| Earth pulse | Earth metric | 5s loop |
| Compass spin | Walking mode strip icon | 18s loop |
| Map shimmer | `.world-shell-skeleton::before` | 1.6s loop |

## Reduced motion

`prefers-reduced-motion: reduce` and `.world-reduced-motion` disable ambient loops and transitions.

## Audio hooks (framework)

No sounds ship in V2.0. Register handlers on `window.questoryWorldAudio`:

```js
window.questoryWorldAudio = {
  directorWhisper: (payload) => {},
  earthPulse: () => {},
  treasureFound: ({ id }) => {},
};
```

Emit via `emitWorldAudio` from `worldExperienceEngine.js`.

## Micro-interactions

- Button hover: `translateY(-1px)` on HUD controls (`worldPolish.css`)
- Touch feedback: 44px minimum targets
- Future: haptic vibration on mobile treasure events
