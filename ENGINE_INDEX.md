# Questory Engine Index

> Alphabetical catalog of every engine and orchestrator module. **Check here before creating new files.**

**Related documents:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [KNOWN_PATTERNS.md](./KNOWN_PATTERNS.md) · [AI_WORKFLOW.md](./AI_WORKFLOW.md)

---

## Table of Contents

- [How to use this index](#how-to-use-this-index)
- [Engines A–Z](#engines-az)
- [Orchestrators & Flow Modules](#orchestrators--flow-modules)
- [Support Modules](#support-modules)

---

## How to use this index

Before adding a module, search this file for the responsibility. If an engine already owns it, **extend that engine**.

Each entry lists:
- **Purpose** — one-line responsibility
- **Primary exports** — key functions/constants
- **Dependencies** — what it imports
- **Consumers** — what uses it

---

## Engines A–Z

### adaptiveAudioDirector.js

| | |
|---|---|
| **Purpose** | Mood-based adaptive audio plans for adventure play |
| **Primary exports** | `resolveAdaptiveAudioContext`, `buildAdaptiveAudioPlan`, `getAudioMoodForAdventure`, `MOOD_AUDIO_MAP` |
| **Dependencies** | `directorAudioMood.js`, adventure metadata |
| **Consumers** | `AdaptiveAudioLayer.jsx`, play flow |

---

### adventureDirector.js

| | |
|---|---|
| **Purpose** | AI adventure blueprint generation, director presets, narrative structure |
| **Primary exports** | `generateAdventureBlueprint`, `blueprintToCreateDraft`, `DIRECTOR_PRESETS`, `refineDirectorBlueprint` |
| **Dependencies** | Templates, tone presets |
| **Consumers** | `adventureAssistant.js`, create adventure UI, `ExperienceUI` |

---

### arEngine.js

| | |
|---|---|
| **Purpose** | AR scene normalization, completion tracking, finale resolution |
| **Primary exports** | `normalizeArScene`, `markArSceneComplete`, `shouldPlayArScene`, `getAdventureArFinale`, `AR_SCENE_TYPES` |
| **Dependencies** | `timelineEngine.js`, horror/family asset catalogs |
| **Consumers** | `CinematicAR.jsx`, `claimFlow.js`, `codexEngine`, play flow |

---

### audioTimelineEngine.js

| | |
|---|---|
| **Purpose** | Audio asset resolution and timeline playback controller |
| **Primary exports** | `createAudioTimelineController`, `resolveAudioAsset`, `getAudioTimelineEvents` |
| **Dependencies** | Audio asset URLs |
| **Consumers** | `CinematicTimelinePlayer.jsx`, timeline playback |

---

### branchingEngine.js

| | |
|---|---|
| **Purpose** | Adventure path branching, branch finales, victory branch effects |
| **Primary exports** | `commitBranchPath`, `applyBranchVictoryEffects`, `getBranchSummary`, `resolveBranchFinale` |
| **Dependencies** | `worldEngine.js`, `arEngine.js` |
| **Consumers** | Play flow, `claimFlow.js`, `MedallionFinder.jsx` |

---

### cameraFxEngine.js

| | |
|---|---|
| **Purpose** | Camera effect CSS class resolution for cinematic playback |
| **Primary exports** | `getCameraFxClassList` |
| **Dependencies** | Timeline FX state |
| **Consumers** | `cinematicComponents.jsx` |

---

### choreographyEngine.js

| | |
|---|---|
| **Purpose** | Choreography action resolution during timeline playback |
| **Primary exports** | `resolveChoreographyFx`, `CHOREOGRAPHY_ACTIONS`, `describeChoreographyEvent` |
| **Dependencies** | Timeline events |
| **Consumers** | Cinematic playback components |

---

### cinematicAssetEngine.js

| | |
|---|---|
| **Purpose** | Match cinematic entities to scenes from prompts and tone |
| **Primary exports** | `enhanceSceneWithCinematicAssets`, `applyCinematicEntityToScene`, `autoPickEntitiesForPrompt` |
| **Dependencies** | `cinematicAssetCatalog.js` |
| **Consumers** | `aiSceneGenerator.js`, AR scene builder |

---

### codexEngine.js

| | |
|---|---|
| **Purpose** | Read-only archive snapshot across all discovery systems |
| **Primary exports** | `getCodexSnapshot`, `markCodexEntrySeen`, `CODEX_CATEGORIES`, `normalizeCodex` |
| **Dependencies** | lore, world, season, engagement, worldDiscovery, questoryIdentity |
| **Consumers** | `CodexUI.jsx`, Passport Codex tab |

---

### creatorEconomyEngine.js

| | |
|---|---|
| **Purpose** | Creator profiles, followers, revenue, analytics, store, verification, reputation |
| **Primary exports** | `getCreatorEconomySnapshot`, `followCreator`, `subscribeCreator`, `recordCreatorCompletion`, `STORE_CATALOG`, `EXTENSION_HOOKS` |
| **Dependencies** | `economy.js`, `seasonEngine`, `questoryIdentityEngine`, `seed.js` |
| **Consumers** | `CreatorEconomyUI.jsx`, `EconomyUI.jsx`, `SweepUI.jsx`, `QuestoryMap.jsx`, `claimFlow.js`, `mapDiscovery.js`, `livingEarthEngine.js` |

---

### craftingEngine.js

| | |
|---|---|
| **Purpose** | Recipe catalog, craft transactions, permanent bonus multipliers |
| **Primary exports** | `getCraftingSnapshot`, `craftArtifact`, `canCraftRecipe`, `getDiscoveryRadiusMultiplier`, `CRAFT_RECIPES` |
| **Dependencies** | `explorerEconomyEngine.js` |
| **Consumers** | `CraftingUI.jsx`, `finderMode.js`, `mapDiscovery.js`, `legendaryHuntEngine.js` |

---

### legendaryHuntEngine.js

| | |
|---|---|
| **Purpose** | World boss spawn, community progress, multi-stage hunts, live races, legendary rewards |
| **Primary exports** | `getLegendaryHuntSnapshot`, `joinLegendaryHunt`, `recordLegendaryHuntAction`, `applyLegendaryHuntOnVictory`, `WORLD_BOSSES`, `resolveActiveWorldBoss` |
| **Dependencies** | `engagement`, `socialWorldEngine`, `craftingEngine`, `explorerEconomyEngine`, `livingWorldEventsEngine` |
| **Consumers** | `LegendaryHuntUI.jsx`, `questoryIdentityEngine`, `claimFlow.js`, `QuestoryMap.jsx`, `codexEngine` |

---

### entityEngine.js

| | |
|---|---|
| **Purpose** | AR entity spatial positions and animation state during playback |
| **Primary exports** | `computeEntityState`, `resolveAnchor`, `SPATIAL_POSITIONS`, `ENTITY_ANIMATIONS` |
| **Dependencies** | Timeline elapsed time |
| **Consumers** | Cinematic AR components |

---

### explorerEconomyEngine.js

| | |
|---|---|
| **Purpose** | Persistent multi-currency inventory and material derivation |
| **Primary exports** | `getExplorerEconomySnapshot`, `grantExplorerCurrency`, `CURRENCY_TYPES`, `normalizeExplorerEconomy` |
| **Dependencies** | `loreCollectionsEngine`, `questoryIdentityEngine`, `seasonEngine`, `seed.js` |
| **Consumers** | `ExplorerEconomyPanel.jsx`, `craftingEngine.js`, `codexEngine` |

---

### livingNpcEngine.js

| | |
|---|---|
| **Purpose** | NPC memory, trust, return-visitor dialogue, victory records |
| **Primary exports** | `recordLivingNpcVictory`, `resolveLivingNpcPresentation`, `recordNpcDialogueSeen`, `NPC_MOODS` |
| **Dependencies** | `worldEngine.js` (SEED_NPCS) |
| **Consumers** | Play flow NPC cards, `claimFlow.js`, `codexEngine`, `aiNpcEngine.js` |

---

### aiNpcEngine.js

| | |
|---|---|
| **Purpose** | Long-term NPC memory, relationships, dynamic dialogue, quest hooks, AI prompt payloads |
| **Primary exports** | `getAiNpcSnapshot`, `recordNpcEncounter`, `recordNpcChoice`, `generateNpcDialogue`, `generateNpcQuestHook`, `buildNpcPromptPayload`, `AI_NPC_PROFILES` |
| **Dependencies** | `livingNpcEngine`, `playerProgressionEngine`, `legendaryHuntEngine`, `marketplaceEngine`, `creatorEconomyEngine` |
| **Consumers** | `AiNpcUI.jsx`, `WorldEngineUI.jsx`, `codexEngine`, `claimFlow.js`, `QuestoryMap.jsx` |

---

### dynamicStoryEngine.js

| | |
|---|---|
| **Purpose** | Story arcs, beats, chapter progress, adventure-linked story advancement |
| **Primary exports** | `getDynamicStorySnapshot`, `advanceStoryArc`, `recordStoryBeat`, `resolveStoryBeatForAdventure`, `STORY_ARCS` |
| **Dependencies** | `aiNpcEngine`, `legendaryHuntEngine`, `playerProgressionEngine` |
| **Consumers** | `AiNpcUI.jsx`, `codexEngine`, `claimFlow.js`, `QuestoryMap.jsx` |

---

### developerHealthEngine.js

| | |
|---|---|
| **Purpose** | Dev-only engine health probes and state inspector for Developer Dashboard |
| **Primary exports** | `runDeveloperHealthCheck` |
| **Dependencies** | Major engines (living world, discovery, economy, NPC, claim, branching, etc.) |
| **Consumers** | `DeveloperDashboard.jsx` |

---

### marketplaceEngine.js

| | |
|---|---|
| **Purpose** | Listings, trades, auctions, inventory, dynamic pricing, market activity |
| **Primary exports** | `getMarketplaceSnapshot`, `createListing`, `purchaseListing`, `makeOffer`, `acceptOffer`, `placeAuctionBid`, `giftItem`, `MARKET_VENUES` |
| **Dependencies** | `explorerEconomyEngine`, `craftingEngine`, `creatorEconomyEngine`, `seasonEngine` |
| **Consumers** | `MarketplaceUI.jsx`, `QuestoryMap.jsx`, `livingEarthEngine.js`, `SocialUI.jsx`, `SweepUI.jsx` |

---

### livingEarthEngine.js

| | |
|---|---|
| **Purpose** | Globe presentation snapshot — discovery colors, world HUD, stream pulses, boss beacons |
| **Primary exports** | `getLivingEarthSnapshot`, `isEarthMode`, `markEarthCeremonySeen`, `getRegionFlyTarget`, `FOG_VISUAL_COLORS` |
| **Dependencies** | `worldDiscoveryEngine`, `livingWorldEngine`, `socialWorldEngine`, `questoryIdentityEngine`, `legendaryHuntEngine`, `seasonEngine` |
| **Consumers** | `LivingEarthUI.jsx`, `QuestoryMap.jsx` |

---

### livingWorldEngine.js

| | |
|---|---|
| **Purpose** | Map heat, explorer simulation, timeline pulses, heat zones |
| **Primary exports** | `getLivingWorldSnapshot`, `HEAT_LEVELS`, `LIVING_WORLD_LIMITS` |
| **Dependencies** | `livingWorldEventsEngine`, `mapDiscovery`, `social.js`, `worldEventEngine` |
| **Consumers** | `LivingWorldLayer.jsx`, `QuestoryMap.jsx`, `LivingWorldTimeline.jsx`, `livingEarthEngine.js` |

---

### livingWorldEventsEngine.js

| | |
|---|---|
| **Purpose** | Ambient activity, visit heat, legendary drops, event notifications |
| **Primary exports** | `getLivingWorldEventsSnapshot`, `buildAmbientActivityBanners`, `getActiveLegendaryDrop` |
| **Dependencies** | `mapDiscovery`, adventures |
| **Consumers** | `livingWorldEngine`, `WorldEventUI`, activity feeds |

---

### loreCollectionsEngine.js

| | |
|---|---|
| **Purpose** | Collection lore catalog, unlock on victory, story views |
| **Primary exports** | `unlockLoreOnVictory`, `getAllCollectionStories`, `getCollectionStoryView`, `COLLECTION_LORE_CATALOG` |
| **Dependencies** | `engagement.js`, `seed.js` |
| **Consumers** | `claimFlow.js`, `codexEngine`, `CollectionLoreUI.jsx` |

---

### particleFxEngine.js

| | |
|---|---|
| **Purpose** | Particle layer presets and CSS class building |
| **Primary exports** | `resolveParticleLayers`, `PARTICLE_LAYER_TYPES`, `buildParticleLayerClassList` |
| **Dependencies** | Entity/scene layer config |
| **Consumers** | Cinematic components |

---

### playerProgressionEngine.js

| | |
|---|---|
| **Purpose** | Explorer XP, levels, ranks, reputation, season rank, milestones |
| **Primary exports** | `getPlayerProgressionSnapshot`, `applyProgressionOnVictory`, `grantBonusXp`, `XP_REWARDS` |
| **Dependencies** | engagement, social, socialWorld, questoryIdentity, codex, world, season |
| **Consumers** | `PlayerProgressionUI.jsx`, `claimFlow.js` |

---

### progressionEngine.js

| | |
|---|---|
| **Purpose** | **Clue-step** advancement during play (not player XP) |
| **Primary exports** | `advanceClueForAdventure`, `continueAfterBonus`, `applyPlayNavigation` |
| **Dependencies** | `claimSystem`, `seed.js`, `social.js`, `expansion.js` |
| **Consumers** | `main.jsx` play flow |

> ⚠️ Do not confuse with `playerProgressionEngine.js`.

---

### questoryIdentityEngine.js

| | |
|---|---|
| **Purpose** | Season progress, world boss, hall of fame, sponsored campaigns, identity feed |
| **Primary exports** | `getIdentitySnapshot`, `getSeasonProgress`, `resolveWorldBoss`, `HALL_OF_FAME_EXPLORERS` |
| **Dependencies** | `seasonEngine`, `socialWorldEngine`, `worldEventEngine`, `engagement.js` |
| **Consumers** | `QuestoryIdentityPanel.jsx`, `WorldBossLayer.jsx`, `codexEngine` |

---

### seasonEngine.js

| | |
|---|---|
| **Purpose** | Current season config, creator worlds catalog, world boss scaffold |
| **Primary exports** | `getCurrentSeason`, `CREATOR_WORLDS`, `WORLD_BOSS_SCAFFOLD`, `getSeasonForAdventure` |
| **Dependencies** | Static config |
| **Consumers** | questoryIdentity, explorerEconomy, playerProgression, codex |

---

### socialWorldEngine.js

| | |
|---|---|
| **Purpose** | Territories, races, guild progress, city completion, social feeds |
| **Primary exports** | `getSocialDiscoverySnapshot`, `computeCityCompletionPct`, `computeGuildProgress`, `TERRITORY_AREAS` |
| **Dependencies** | `social.js`, adventures |
| **Consumers** | `SocialUI.jsx`, map layers, `playerProgressionEngine` |

---

### timelineEngine.js

| | |
|---|---|
| **Purpose** | Cinematic timeline normalization, playback timing, FX resolution |
| **Primary exports** | `normalizeTimeline`, `computePlaybackAtTime`, `createTimelineRunner`, `TIMELINE_ACTIONS` |
| **Dependencies** | Scene/timeline raw data |
| **Consumers** | `arEngine`, `CinematicTimelinePlayer.jsx`, `entityEngine` |

---

### worldDiscoveryEngine.js

| | |
|---|---|
| **Purpose** | Geographic discovery levels, completion tiers, global goals |
| **Primary exports** | `getDiscoveredWorldSnapshot`, `DISCOVERY_LEVELS`, `COMPLETION_TIERS`, `getFirstDiscoveries` |
| **Dependencies** | `mapDiscovery`, `seasonEngine`, `expansion.js` |
| **Consumers** | `DiscoveredWorldPanel.jsx`, `CityDiscoveryRingLayer.jsx`, `codexEngine`, `livingEarthEngine.js`, `creatorEconomyEngine.js` |

---

### worldEngine.js

| | |
|---|---|
| **Purpose** | Weather, NPCs, hidden discoveries, city events, endings, prestige |
| **Primary exports** | `applyEndingRewards`, `attemptDiscovery`, `SEED_NPCS`, `HIDDEN_DISCOVERIES`, `normalizeWorld` |
| **Dependencies** | Adventure/world config |
| **Consumers** | Play flow, `claimFlow.js`, `livingNpcEngine`, `codexEngine` |

---

### worldEventEngine.js

| | |
|---|---|
| **Purpose** | Scheduled world events, limited relics, event weather, community milestones |
| **Primary exports** | `getWorldEventContext`, `recordWorldEventVictory`, `WORLD_EVENTS`, `safeGetWorldEventContext` |
| **Dependencies** | Calendar, adventures |
| **Consumers** | Map, `claimFlow`, director, NPC dialogue, living world |

---

## Orchestrators & Flow Modules

### claimFlow.js

| | |
|---|---|
| **Purpose** | **Victory orchestrator** — chains all completion hooks into one state transition |
| **Primary exports** | `buildClaimSuccessState` |
| **Dependencies** | engagement, economy, social, expansion, growth, world, lore, events, NPCs, branching, progression |
| **Consumers** | `main.jsx` claim handlers |

### claimSystem.js

| | |
|---|---|
| **Purpose** | Claim method definitions, validation, field config, finder detection |
| **Primary exports** | `CLAIM_METHOD`, `validateClaimAttempt`, `claimMethodUsesFinder`, `normalizeClaimMethod` |
| **Dependencies** | None (pure config + validation) |
| **Consumers** | `claimFlow`, `MedallionFinder`, `seed.js`, create adventure |

### finderMode.js

| | |
|---|---|
| **Purpose** | Medallion GPS search radius, signal strength, capture logic |
| **Primary exports** | `getFinderSearchRadius`, `computeSignalStrength`, `resolveFinderPhase`, `FINDER_PHASE` |
| **Dependencies** | `geolocation.js`, `craftingEngine.js` (radius bonuses) |
| **Consumers** | `MedallionFinder.jsx` |

### mapDiscovery.js

| | |
|---|---|
| **Purpose** | Pin visuals, filters, fog-of-war, map reveals |
| **Primary exports** | `recordMapReveal`, `normalizeMapExploration`, `resolvePinVisual`, `MAP_FILTERS` |
| **Dependencies** | `worldEventEngine`, `craftingEngine.js` (fog bonus) |
| **Consumers** | `QuestoryMap.jsx`, `livingWorldEngine`, `worldDiscoveryEngine` |

### seed.js

| | |
|---|---|
| **Purpose** | **State root** — defaultState, normalization, adventure seed, progress helpers |
| **Primary exports** | `defaultState`, `getAdventureProgress`, `createVaultReward`, `STORAGE_KEY` |
| **Dependencies** | All normalize functions from engines |
| **Consumers** | Everything |

---

## Support Modules

| Module | Purpose |
|--------|---------|
| `economy.js` | Coin spends, premium, hints, skips, seasonal events |
| `engagement.js` | Badges, streaks, collections, daily rewards |
| `expansion.js` | National passport, AR finder, expansion rewards |
| `geolocation.js` | GPS position, Haversine distance, check-in |
| `growth.js` | Referrals, quest codes, creator growth |
| `invitation.js` | Onboarding, demo adventure, first-time metrics |
| `persistence.js` | localStorage load/save |
| `rewardInventory.js` | Reward templates, vault resolution |
| `social.js` | Season points, teams, ghost runs, heat |
| `accessRules.js` | Adventure access evaluation, map visibility |
| `directorRuntime.js` | Runtime director chapter/clue resolution |
| `mapClusterBlossom.js` | Cluster blossom marker grouping |
| `mapSpatial.js` | Spatial clustering helpers |
| `mapCamera.js` | Map camera animations |
| `templates.js` | Adventure template presets |
| `developerHealthEngine.js` | Dev-only engine health checks (Phase 14.5) |
| `engineSnapshotUtils.js` | Dev snapshot freeze, timing, state size (Phase 14.75) |
| `timelineCore.js` | Timeline actions/normalization shared module |
| `mapCoordinates.js` | Pure adventure coordinate helpers |
| `messageUtils.js` | Safe message formatting, reason codes |

---

*When adding a new engine, add an entry here in the same commit.*
