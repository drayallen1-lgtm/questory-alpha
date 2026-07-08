# World UX Guide

Questory V2 treats the **map as the operating system**. Every feature — marketplace, guild, earth, sponsor, passport — surfaces as contextual layers around the map, not separate apps.

## Living Atlas (V3)

Questory opens **inside** the world — not on a dashboard.

- **True world camera** — `worldCameraEngine` opens at street-block zoom (~6–10 blocks), centered on the player, adventure start, or downtown; remembers last position.
- **Geography first** — `geographyLayerEngine` fades in districts, landmarks, parks, rails, and trails by zoom.
- **Buildings are the world** — `buildingActivityEngine` attaches lanterns, pulses, and quest anchors to structures.
- **Micro HUD** — `microHudEngine` replaces giant banners with auto-hiding chips (⚠ Forgotten Miner, 💎 Drop, 🔨 Auction).
- **Radial world menu** — `WorldRadialMenu` bloom replaces scattered Layers/Market/Compass buttons.
- **No "World" dock tab** — opening Questory *is* the world; dock is Feed · Passport · Social · Create · Admin.
- **Immersive audio framework** — `immersiveAudioFrameworkEngine` (muted by default, no sounds yet).

## Principles

1. **Map-first** — The map fills ~94% of the viewport. HUD overlays are minimal and anchored to corners.
2. **One thing at a time** — Context focus chip shows a single mode-relevant cue (treasure, clue, war score, city).
3. **Progressive disclosure** — Card deck hidden behind **Layers** until the player asks. City chip collapsed to one line.
4. **Transient overlays** — Notifications are one-line inline; Director whispers fade after ~3s.
5. **Context-aware HUD** — Walking, driving, adventure, and guild war each surface one focus item.

## Marketplace as a world layer

Marketplace is a **map-native world object**, not a permanent HUD stack:

- Venues (`🏪 Downtown Market`, `✨ Creator Bazaar`, `🏛 Legendary Auction`, `🛒 Traveling Merchant`) render as **map pins** at real coordinates — labels appear only when zoomed in or selected, with a subtle glow when hot and a shimmer when event/sponsor boosted.
- Tapping a pin opens a compact **venue preview card** (tagline + live items + **Browse Market** / **Watch Venue**) that floats near the pin, closes on map-background click or Escape, and never covers the map.
- The HUD shows at most a small **`🏪 Market nearby`** chip when activity is nearby — never a full marketplace card by default.
- **Browse Market** deep-links into the Marketplace screen on the correct tab (`featured` / `creator` / `auctions` / `trending`) via `nav()` context.
- The old full-width `MarketplaceMapHud` venue bar is retired in map-first mode.

## User journeys

| Journey | Entry | Anchor |
|---------|-------|--------|
| Explore | World shell | Map + Explorer card |
| Guild | Social → Guilds or HUD guild card | Territory layers |
| Marketplace | Venue pin, `Market nearby` chip, or merchant pulse | Venue preview card |
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
