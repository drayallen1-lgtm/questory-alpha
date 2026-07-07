/**
 * Questory V2 — Floating HUD cards (collapsed summaries + expanded previews).
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

function mapTimelineItems(entries = [], fallback = 'Activity nearby') {
  if (!entries.length) {
    return [{ id: 'empty', text: fallback }];
  }
  return entries.slice(0, 4).map((entry) => ({
    id: entry.id || entry.text,
    text: entry.text || entry.label || fallback,
  }));
}

/**
 * @param {object} options
 * @param {object} options.livingWorld
 * @param {object} options.marketplace
 * @param {object} options.faction
 * @param {object} options.worldDiscovery
 * @param {object} options.earth
 * @param {object} [options.legendaryHunt]
 * @param {object} [options.layerSnapshot]
 */
export function buildFloatingHudCards(options = {}) {
  const {
    livingWorld = {},
    marketplace = {},
    faction = {},
    worldDiscovery = {},
    earth = {},
    legendaryHunt = {},
    layerSnapshot = null,
  } = options;

  const timeline = livingWorld.timeline || [];
  const explorerCount =
    livingWorld.presence?.explorersNearby ?? livingWorld.explorerDots?.length ?? timeline.length;
  const wars = faction.wars || [];
  const activeWars = wars.length || faction.contestedCount || 0;
  const liveMarketCount =
    (marketplace.auctions?.length || 0) + (marketplace.listings?.length || 0);
  const earthPct =
    worldDiscovery.worldRegion?.animatedDisplayPercent ??
    worldDiscovery.worldRegion?.completionPercent ??
    earth.worldDiscovery?.worldRegion?.animatedDisplayPercent ??
    0;
  const cityLabel = worldDiscovery.currentRegion?.label || 'Your city';
  const cityPct = worldDiscovery.currentRegion?.completionPercent;

  const cards = [
    {
      id: 'explorer',
      layerKey: 'explorer',
      icon: '👣',
      title: 'Explorer Activity',
      metric: explorerCount || timeline.length,
      metricLabel: 'nearby',
      items: mapTimelineItems(timeline, 'Explorers are active nearby'),
      viewAllScreen: 'social',
      expandable: true,
    },
    {
      id: 'guild',
      layerKey: 'guild',
      icon: '⚔',
      title: 'Territory War',
      metric: activeWars,
      metricLabel: 'active',
      items: wars.length
        ? wars.slice(0, 4).map((war) => ({
            id: war.territoryId,
            text: `${war.name}: ${war.leader || '—'} vs ${war.challenger || '—'}`,
          }))
        : mapTimelineItems(faction.timeline?.slice(0, 3) || [], 'No active territory wars'),
      viewAllScreen: 'social',
      viewAllOptions: { socialTab: 'guild', guildTab: 'wars' },
      expandable: true,
    },
    {
      id: 'creator',
      layerKey: 'creator',
      icon: '✨',
      title: 'Creator Hunt',
      metricLabel: 'Launch adventure',
      items: [
        { id: 'c1', text: 'Describe your idea — AI Director shapes the trail' },
        { id: 'c2', text: 'Preview pins on the map before you publish' },
      ],
      viewAllScreen: 'create',
      viewAllOptions: { launchStep: 'describe' },
      expandable: true,
    },
    {
      id: 'sponsor',
      layerKey: 'sponsor',
      icon: '📣',
      title: 'Sponsor Event',
      metricLabel: 'Promote nearby',
      items: [
        { id: 's1', text: 'Launch a promotion that lights up downtown' },
        { id: 's2', text: 'Turn foot traffic into a customer hunt' },
      ],
      viewAllScreen: 'sponsor',
      expandable: true,
    },
    {
      id: 'marketplace',
      layerKey: 'marketplace',
      icon: '🏪',
      title: 'Marketplace',
      metric: Math.min(liveMarketCount, 99),
      metricLabel: 'live',
      items: mapTimelineItems(
        marketplace.activityFeed || [],
        'Market prices updated downtown'
      ),
      viewAllScreen: 'marketplace',
      viewAllOptions: { marketplaceVenueId: 'downtown-market', marketplaceTab: 'featured' },
      expandable: true,
    },
    {
      id: 'liveHunt',
      layerKey: 'liveHunt',
      icon: '🎯',
      title: 'Live Hunt',
      metricLabel: legendaryHunt.hasActiveBoss ? 'live' : 'watch',
      items: legendaryHunt.hasActiveBoss
        ? [
            {
              id: 'lh-boss',
              text: `${legendaryHunt.worldBoss?.name || 'Legendary boss'} has awakened`,
            },
            ...(legendaryHunt.alerts || []).slice(0, 2).map((alert) => ({
              id: alert.id,
              text: alert.title || alert.text || 'Legendary alert',
            })),
          ]
        : mapTimelineItems(
            legendaryHunt.timeline || [],
            'No legendary drop right now — watch the map pulse'
          ),
      viewAllScreen: 'legendary-hunt',
      expandable: true,
    },
    {
      id: 'earth',
      layerKey: 'earth',
      icon: '🌍',
      title: 'Earth',
      metric: `${Number(earthPct).toFixed(1)}%`,
      metricLabel: 'living planet',
      wide: true,
      items: [
        { id: 'e1', text: `${cityLabel}${cityPct != null ? ` · ${Math.round(cityPct)}% discovered` : ''}` },
        ...(earth.globalGoals || []).slice(0, 2).map((goal) => ({
          id: goal.id,
          text: `${goal.icon || '🌍'} ${goal.label}`,
        })),
        ...(earth.discoveryStream || []).slice(0, 1).map((s) => ({
          id: s.id || s.text,
          text: s.text || s.label || 'Global discovery spreading',
        })),
      ],
      viewAllScreen: 'world',
      expandable: true,
    },
  ];

  const visibleCards = cards.filter((card) => {
    if (!layerSnapshot?.hudCards) return true;
    return layerSnapshot.hudCards[card.layerKey] !== false;
  });

  return wrapEngineSnapshot({
    cards: visibleCards,
    explorerCount,
    activeWars,
    liveMarketCount,
    earthPct,
  });
}
