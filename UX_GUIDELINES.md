# Questory V2 — UX Guidelines

> Map-first living world experience. Read with [MAP_FIRST_ARCHITECTURE.md](./MAP_FIRST_ARCHITECTURE.md) and [WORLD_SYSTEM.md](./WORLD_SYSTEM.md).

---

## North Star

When someone opens Questory, they should feel like they opened a **living world** — not an app with a map tab.

The map is the operating system. Everything else floats around it.

---

## Layout

| Zone | Purpose |
|------|---------|
| **Map frame** | 85–90% of viewport; primary interaction surface |
| **Living city** | City personality strip above the HUD |
| **Floating HUD** | Collapsed cards for Earth, guild, marketplace, hunts |
| **Adaptive strip** | Context chips (walking, driving, adventure, guild war) |
| **Ambient Director** | Single whisper — game-master nudge, dismissible |
| **Floating dock** | Primary navigation; glass bar at bottom |

Hide legacy stacked panels inside `WorldShell` (`world-shell--map-hidden-panels`).

---

## Visual Language

- **Glass surfaces:** `rgba(15, 23, 42, 0.68–0.88)` + `backdrop-filter: blur(16–20px)`
- **Depth:** layered shadows (`worldPolish.css` tokens)
- **Accent:** teal `#5eead4` for discovery; faction colors for war
- **Motion:** `cubic-bezier(0.22, 1, 0.36, 1)` for entrances; respect `prefers-reduced-motion`
- **Typography:** uppercase micro-labels (11–13px), bold metrics for live counts

---

## Interaction Rules

1. **Collapse by default** — cards expand on tap, dismiss on outside click or Escape
2. **One prominent whisper** — Director speaks softly; never stack modals on the map
3. **Context-aware HUD** — zoom and selection change card priority and strip mode
4. **Deep links** — every floating destination preserves tab/venue via `nav(screen, id, options)`
5. **Earth is a mode** — zoom out reveals Living Earth; street zoom returns to play

---

## Accessibility

- All floating controls are keyboard-focusable with visible `:focus-visible` rings
- HUD regions use `aria-label` (`World HUD`, `World navigation`, `World Director whisper`)
- Live regions (`aria-live="polite"`) for city spotlight and notifications
- High-contrast mode: stronger borders via `prefers-contrast: more` in `worldPolish.css`

---

## Responsive

| Breakpoint | Behavior |
|------------|----------|
| Desktop | HUD grid max-width 420px, centered |
| Mobile portrait | Horizontal scroll on adaptive strip; compact dock labels |
| Mobile landscape | 4-column HUD grid, shorter city panel |
| Short height (`max-height: 640px`) | Tighter card padding |

---

## Do / Don't

| Do | Don't |
|----|-------|
| Extend engines + snapshots | Duplicate business logic in JSX |
| Add layers via `progressiveWorldLayersEngine` | Show every system at once |
| Use floating cards for summaries | Add permanent side panels on the map |
| Whisper + notify with priority | Spam toasts over the map |
| Run `npm run build` before commits | Commit `dist/` |

---

*V2 UX sweep complete — map-first living world.*
