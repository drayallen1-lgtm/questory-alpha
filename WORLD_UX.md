# World UX Guide

Questory V2 treats the **map as the operating system**. Every feature — marketplace, guild, earth, sponsor, passport — surfaces as contextual layers around the map, not separate apps.

## Principles

1. **Map-first** — The world shell (`WorldShell`) is the default screen. Navigation returns to the map.
2. **Contextual cards** — Floating HUD cards appear when relevant and collapse when not.
3. **Story over status** — Empty states use narrative copy (`worldExperienceEngine.resolveEmptyState`), not "No data".
4. **One design language** — Glass panels, elevation tokens, and 8px spacing live in `worldDesignTokens.css`.
5. **Subtle Director** — Ambient whispers guide; they never block the map.

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
