# World UX Guide

Questory V2 treats the **map as the operating system**. Every feature — marketplace, guild, earth, sponsor, passport — surfaces as contextual layers around the map, not separate apps.

## Principles

1. **Map-first** — The map fills ~94% of the viewport. HUD overlays are minimal and anchored to corners.
2. **One thing at a time** — Context focus chip shows a single mode-relevant cue (treasure, clue, war score, city).
3. **Progressive disclosure** — Card deck hidden behind **Layers** until the player asks. City chip collapsed to one line.
4. **Transient overlays** — Notifications are one-line inline; Director whispers fade after ~3s.
5. **Context-aware HUD** — Walking, driving, adventure, and guild war each surface one focus item.

## User journeys

| Journey | Entry | Anchor |
|---------|-------|--------|
| Explore | World shell | Map + Explorer card |
| Guild | Social → Guilds or HUD guild card | Territory layers |
| Marketplace | Dock Market or HUD marketplace | Downtown venues |
| Adventure | Director whisper or Explorer CTA | Play screen |
| Earth | HUD Earth card or zoom out | Living Earth overlay |
| Sponsor | Dock Sponsor | Campaign launch |

## Recovery

When updates fail, `WorldRecoveryBanner` offers **Retry** or **Continue Offline** — never a dead end.

## Accessibility

- Keyboard: Escape collapses expanded HUD cards.
- Touch targets: minimum 44px via `.world-touch-target`.
- `state.accessibility` drives reduced motion, high contrast, and colorblind-safe classes on the world shell.

## Related docs

- [HUD_GUIDE.md](./HUD_GUIDE.md)
- [MAP_FIRST_ARCHITECTURE.md](./MAP_FIRST_ARCHITECTURE.md)
- [ANIMATION_GUIDE.md](./ANIMATION_GUIDE.md)
