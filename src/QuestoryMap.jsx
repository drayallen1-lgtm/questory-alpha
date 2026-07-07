import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LocateFixed, MapPin } from 'lucide-react';
import { LiveMapOverlay } from './SocialUI';
import { VISIBILITY_MODES } from './social';
import {
  MAPBOX_FALLBACK_MESSAGE,
  MAPBOX_WEBGL_FALLBACK_MESSAGE,
  getMapboxToken,
  buildAdventureMarkers,
  buildClueMarkers,
  computeMapPinStats,
  getMapBounds,
  hasMapboxToken,
} from './mapUtils';
import { AccessStatusBanner, usePlayerLocation } from './AccessRulesUI';
import { evaluateAccessContext } from './accessRules';
import { haversineDistanceMeters } from './geolocation';
import { isDev } from './config/env';
import {
  MAP_FILTERS,
  MAP_LAYER_IDS,
  MAP_SOURCE_IDS,
  adventureMatchesFilter,
  createAdventurePinElement,
  createClusterElement,
  filterMapAdventures,
  markersToGeoJSON,
  resolvePinVisual,
  revealedAreasGeoJSON,
  recordMapReveal,
  wireAdventurePinElement,
} from './mapDiscovery';
import {
  buildClusterTooltipHtml,
  clusterVisualClasses,
  easeMapTo,
  flyMapTo,
  summarizeClusterMarkers,
} from './mapSpatial';
import { createMapCameraController } from './mapCamera';
import { ClusterAdventurePicker, MapFilterBar, MapPinCard } from './MapPinCard';
import { LivingClusterBlossomOverlay } from './LivingClusterBlossom';
import { LivingWorldLayer } from './LivingWorldLayer';
import { MapDiscoveryPulse } from './MapDiscoveryPulse';
import { DiscoveryTrailLayer } from './DiscoveryTrailLayer';
import { TerritoryLayer } from './TerritoryLayer';
import { SocialRaceLayer } from './SocialRaceLayer';
import {
  LivingWorldActivityFeed,
  LivingWorldNotifications,
} from './LivingWorldActivityFeed';
import { BLOSSOM_MAX_PINS, groupMarkersByCategory, livingClusterPhase } from './mapClusterBlossom';
import { DISCOVERY_BLOOM_TIMING, playMapUiCue } from './mapUiCues';
import { LivingWorldTimeline } from './LivingWorldTimeline';
import { formatHeatTooltip, getLivingWorldSnapshot } from './livingWorldEngine';
import { getLivingWorldEventsSnapshot } from './livingWorldEventsEngine';
import { triggerDiscoveryPulse } from './MapDiscoveryPulse';
import { WorldBossLayer } from './WorldBossLayer';
import { ArTreasureLayer } from './ArTreasureLayer';
import { QuestoryIdentityPanel } from './QuestoryIdentityPanel';
import {
  buildRaceActivityBanners,
  buildRaceMarkers,
  getSocialDiscoverySnapshot,
} from './socialWorldEngine';
import { getQuestoryIdentitySnapshot } from './questoryIdentityEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { getFactionSnapshot } from './factionEngine';
import { LegendaryHuntMapHud } from './LegendaryHuntUI';
import { DiscoveryHud } from './DiscoveryHud';
import { CityDiscoveryRingLayer } from './CityDiscoveryRingLayer';
import { DiscoveredWorldPanel, DiscoveryCeremonyToast } from './DiscoveredWorldPanel';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getLivingEarthSnapshot, EARTH_MODE_EXIT_ZOOM } from './livingEarthEngine';
import { getProgressiveLayerSnapshot, WORLD_LAYER_IDS } from './progressiveWorldLayersEngine';
import { ProgressiveLayer } from './ProgressiveLayer';
import { getSmartNotificationSnapshot, normalizeSmartNotification } from './smartNotificationEngine';
const LivingEarthOverlay = lazy(() =>
  import('./LivingEarthUI').then((m) => ({ default: m.LivingEarthOverlay }))
);
import { getCreatorEconomySnapshot } from './creatorEconomyEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getAiNpcSnapshot } from './aiNpcEngine';
import { getDynamicStorySnapshot } from './dynamicStoryEngine';
import { MarketplaceMapHud } from './MarketplaceUI';

const ADVENTURE_SOURCE = MAP_SOURCE_IDS.ADVENTURES;

function parseFeatureProps(props) {
  if (!props) return {};
  const out = { ...props };
  if (out.point_count != null) out.point_count = Number(out.point_count);
  if (out.cluster_id != null) out.cluster_id = Number(out.cluster_id);
  return out;
}

function isClusterFeature(props) {
  return props.point_count != null && Number.isFinite(Number(props.point_count));
}

function findNearestHeatZone(coords, zones = []) {
  if (!coords || !zones.length) return null;
  const [lng, lat] = coords;
  let best = null;
  let bestDist = Infinity;
  for (const zone of zones) {
    const dlat = (zone.latitude - lat) * 111000;
    const dlng = (zone.longitude - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.hypot(dlat, dlng);
    if (dist < bestDist && dist < 2000) {
      best = zone;
      bestDist = dist;
    }
  }
  return best;
}

function setupAdventureLayerInteractions(map, { getMarkerById, getMapState, getHeatZones }) {
  const clusterPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'questory-cluster-tooltip-popup',
    offset: 14,
    maxWidth: '260px',
  });

  map.on('mouseenter', MAP_LAYER_IDS.CLUSTERS, (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const count = Number(e.features?.[0]?.properties?.point_count) || 0;
    const clusterId = e.features?.[0]?.properties?.cluster_id;
    if (count <= 0 || clusterId == null) return;

    map.getSource(ADVENTURE_SOURCE).getClusterLeaves(clusterId, 50, 0, (err, leaves) => {
      if (err || !leaves?.length) {
        clusterPopup
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(buildClusterTooltipHtml({ count }))
          .addTo(map);
        return;
      }
      const markers = leaves
        .map((f) => getMarkerById?.(f.properties?.id ?? f.id))
        .filter(Boolean);
      const meta = summarizeClusterMarkers(markers, getMapState?.());
      meta.count = count;
      const heatZone = findNearestHeatZone(e.features[0].geometry.coordinates, getHeatZones?.());
      if (heatZone) meta.heatLabel = formatHeatTooltip(heatZone);
      clusterPopup
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(buildClusterTooltipHtml(meta))
        .addTo(map);
    });
  });

  map.on('mouseleave', MAP_LAYER_IDS.CLUSTERS, () => {
    map.getCanvas().style.cursor = '';
    clusterPopup.remove();
  });
}

function addAdventureClusterLayers(map) {
  if (map.getLayer(MAP_LAYER_IDS.CLUSTERS)) return;

  map.addLayer({
    id: MAP_LAYER_IDS.CLUSTERS,
    type: 'circle',
    source: ADVENTURE_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'hasLegendary'], 1],
        '#a78bfa',
        ['==', ['get', 'hasEvent'], 1],
        '#f97316',
        '#14b8a6',
      ],
      'circle-radius': ['step', ['get', 'point_count'], 24, 5, 30, 15, 36],
      'circle-opacity': 0,
      'circle-stroke-width': 0,
    },
  });

  map.addLayer({
    id: MAP_LAYER_IDS.CLUSTER_COUNT,
    type: 'symbol',
    source: ADVENTURE_SOURCE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: { 'text-color': '#ffffff', 'text-opacity': 0 },
  });

  map.addLayer({
    id: MAP_LAYER_IDS.UNCLUSTERED,
    type: 'circle',
    source: ADVENTURE_SOURCE,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 14,
      'circle-opacity': 0,
    },
  });
}

function MapPinFallbackList({ adventureMarkers, onAdventureClick }) {
  if (!adventureMarkers.length) return null;

  return (
    <div className="map-pin-fallback-list">
      <p className="map-pin-fallback-title">Adventures near you</p>
      <div className="fallback-marker-list compact">
        {adventureMarkers.slice(0, 8).map((marker) => {
          const visual = resolvePinVisual(marker.adventure);
          return (
            <button
              key={marker.id}
              type="button"
              className={`fallback-marker adventure pin-${marker.pinAccess || 'playable'}`}
              onClick={() => onAdventureClick?.(marker.adventure, marker)}
            >
              <span className="questory-pin-icon">{visual.icon}</span>
              <span>
                <b>{marker.title}</b>
                <small>{visual.label}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FallbackMap({
  adventureMarkers = [],
  clueMarkers = [],
  onAdventureClick,
  onClueClick,
  mini = false,
  className = '',
  notice = MAPBOX_FALLBACK_MESSAGE,
}) {
  const allMarkers = [...adventureMarkers, ...clueMarkers];
  const bounds = getMapBounds(allMarkers);

  return (
    <div className={`fallback-map ${mini ? 'mini' : ''} ${className}`}>
      <div className="fallback-map-grid" />
      <div className="fallback-map-body">
        {!mini && <p className="fallback-map-notice">{notice}</p>}
        {mini && <p className="fallback-map-notice mini-notice">{notice}</p>}
        {bounds && (
          <p className="fallback-map-region">
            {bounds.minLat.toFixed(3)}°N · {Math.abs(bounds.minLng).toFixed(3)}°W
          </p>
        )}
        <div className="fallback-marker-list">
          {adventureMarkers.map((marker) => {
            const visual = resolvePinVisual(marker.adventure);
            return (
              <button
                key={marker.id}
                type="button"
                className={`fallback-marker adventure pin-${marker.pinAccess || 'playable'}`}
                onClick={() => onAdventureClick?.(marker.adventure, marker)}
              >
                <span className="questory-pin-icon">{visual.icon}</span>
                <span>
                  <b>{marker.title}</b>
                  <small>{visual.label}</small>
                </span>
              </button>
            );
          })}
          {clueMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`fallback-marker clue ${marker.active ? 'active' : ''}`}
              onClick={() => onClueClick?.(marker)}
            >
              <span className="clue-num">{marker.index}</span>
              <span>
                <b>{marker.title}</b>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function createUserLocationElement() {
  const el = document.createElement('div');
  el.className = 'user-location-wrap';
  el.innerHTML = `
    <span class="user-near-me-pulse" aria-hidden="true"></span>
    <span class="user-near-me-pulse user-pulse-delay" aria-hidden="true"></span>
    <span class="user-dot"><small>YOU</small></span>
  `;
  return el;
}

export function QuestoryMap({
  adventureMarkers = [],
  clueMarkers = [],
  onAdventureClick,
  onClueClick,
  mini = false,
  className = '',
  showUserLocation = false,
  userLocation = null,
  mapExploration = null,
  mapWorldNow = Date.now(),
  selectedAdventureId = null,
  mapState = null,
  onFindMe,
  findMeSignal = 0,
  onVisiblePinCountChange,
  onPinHoverChange,
  onSpatialStatsChange,
  onClusterDiscover,
  onMapBackgroundClick,
  onBlossomPinSelect,
  onBlossomCategorySelect,
  onBlossomOverflow,
  livingCluster = null,
  livingWorld = null,
  socialDiscovery = null,
  questoryIdentity = null,
  worldDiscovery = null,
  onTerritorySelect = null,
  onMapZoomChange,
  onMapFlyReady,
  isAdmin = false,
  userId = null,
  progressiveLayers = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersOnScreenRef = useRef({});
  const userMarkerRef = useRef(null);
  const mapReadyRef = useRef(false);
  const adventureMarkersRef = useRef(adventureMarkers);
  const markerLookupRef = useRef(new Map());
  const mapStateRef = useRef(mapState);
  const heatZonesRef = useRef([]);
  const userLocationRef = useRef(userLocation);
  const selectedAdventureIdRef = useRef(selectedAdventureId);
  const syncHtmlMarkersRef = useRef(() => {});
  const handleClusterClickRef = useRef(null);
  const onClusterDiscoverRef = useRef(onClusterDiscover);
  const onMapBackgroundClickRef = useRef(onMapBackgroundClick);
  const onBlossomPinSelectRef = useRef(onBlossomPinSelect);
  const onBlossomCategorySelectRef = useRef(onBlossomCategorySelect);
  const onBlossomOverflowRef = useRef(onBlossomOverflow);
  const livingClusterRef = useRef(livingCluster);
  const isAdminRef = useRef(isAdmin);
  const userIdRef = useRef(userId);
  const cameraRef = useRef(null);
  const onAdventureClickRef = useRef(onAdventureClick);
  const onPinHoverChangeRef = useRef(onPinHoverChange);
  const onSpatialStatsChangeRef = useRef(onSpatialStatsChange);
  const onMapZoomChangeRef = useRef(onMapZoomChange);
  onMapZoomChangeRef.current = onMapZoomChange;
  const requestCameraMoveRef = useRef(null);
  const [mapInitFailed, setMapInitFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  adventureMarkersRef.current = adventureMarkers;
  mapStateRef.current = mapState;
  heatZonesRef.current = livingWorld?.heatZones || [];
  userLocationRef.current = userLocation;
  selectedAdventureIdRef.current = selectedAdventureId;
  onAdventureClickRef.current = onAdventureClick;
  onPinHoverChangeRef.current = onPinHoverChange;
  onSpatialStatsChangeRef.current = onSpatialStatsChange;
  onClusterDiscoverRef.current = onClusterDiscover;
  onMapBackgroundClickRef.current = onMapBackgroundClick;
  onBlossomPinSelectRef.current = onBlossomPinSelect;
  onBlossomCategorySelectRef.current = onBlossomCategorySelect;
  onBlossomOverflowRef.current = onBlossomOverflow;
  livingClusterRef.current = livingCluster;
  isAdminRef.current = isAdmin;
  userIdRef.current = userId;
  const token = getMapboxToken();

  if (!cameraRef.current) {
    cameraRef.current = createMapCameraController(() => mapRef.current);
  }
  requestCameraMoveRef.current = cameraRef.current.requestCameraMove;

  const markerLookup = useMemo(() => {
    const map = new Map();
    adventureMarkers.forEach((m) => map.set(m.id, m));
    return map;
  }, [adventureMarkers]);
  markerLookupRef.current = markerLookup;

  const geoJson = useMemo(
    () => markersToGeoJSON(adventureMarkers, mapState),
    [adventureMarkers, mapState]
  );

  const upsertClusterMarker = useCallback((map, clusterId, coords, count, meta, nextIds, options = {}) => {
    const id = `cluster-${clusterId}`;
    nextIds.add(id);
    let entry = markersOnScreenRef.current[id];
    const mergedMeta = { ...meta, count };

    const wireClusterElement = (el) => {
      if (!el || el.dataset.clusterWired === '1') return;
      el.dataset.clusterWired = '1';
      el.style.pointerEvents = 'auto';
      el.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          const current = markersOnScreenRef.current[id];
          const lngLat = current?.getLngLat?.();
          if (!lngLat) return;
          handleClusterClickRef.current?.(clusterId, [lngLat.lng, lngLat.lat]);
        },
        true
      );
    };

    if (!entry) {
      const el = createClusterElement(mergedMeta);
      wireClusterElement(el);
      entry = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(coords).addTo(map);
      markersOnScreenRef.current[id] = entry;
    } else {
      entry.setLngLat(coords);
      const el = entry.getElement();
      if (el) {
        el.className = clusterVisualClasses(mergedMeta);
        const iconEl = el.querySelector('.questory-cluster-icon');
        const countEl = el.querySelector('.questory-cluster-count');
        if (iconEl) iconEl.textContent = mergedMeta.dominant?.icon || '📍';
        if (countEl) countEl.textContent = String(count);
        wireClusterElement(el);
      }
    }

    const el = entry.getElement();
    if (el) {
      el.classList.toggle('questory-cluster-fading', Boolean(options.fading));
      el.style.pointerEvents = options.fading ? 'none' : 'auto';
    }
  }, []);

  const upsertAdventurePin = useCallback(
    (map, id, coords, nextIds, options = {}) => {
      nextIds.add(id);
      const markerData = markerLookup.get(id);
      if (!markerData) return;
      const visual = resolvePinVisual(markerData.adventure, mapStateRef.current);
      const selected = selectedAdventureIdRef.current === id;
      const soloActive = Boolean(options.soloActive);
      let entry = markersOnScreenRef.current[id];

      if (!entry) {
        const el = createAdventurePinElement(visual, {
          selected: selected || soloActive,
          pinAccess: markerData.pinAccess,
          soloActive,
        });
        wireAdventurePinElement(el, {
          markerData,
          visual,
          selected: selected || soloActive,
          onSelect: (data) => {
            if (data?.adventure) onAdventureClickRef.current?.(data.adventure, data);
          },
          onHoverChange: (hoverId) => onPinHoverChangeRef.current?.(hoverId),
        });
        entry = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .addTo(map);
        markersOnScreenRef.current[id] = entry;
      } else {
        entry.setLngLat(coords);
        const el = entry.getElement();
        if (el) {
          el.classList.toggle('pin-solo-active', soloActive);
          el.classList.toggle('pin-selected', selected || soloActive);
          wireAdventurePinElement(el, {
            markerData,
            visual,
            selected: selected || soloActive,
            onSelect: (data) => {
              if (data?.adventure) onAdventureClickRef.current?.(data.adventure, data);
            },
            onHoverChange: (hoverId) => onPinHoverChangeRef.current?.(hoverId),
          });
        }
      }
    },
    [markerLookup]
  );

  const runClusterOpenAnimation = useCallback((clusterId) => {
    const entry = markersOnScreenRef.current[`cluster-${clusterId}`];
    const el = entry?.getElement?.();
    if (!el) return;
    el.classList.remove('cluster-collapsing', 'cluster-opening', 'questory-cluster-fading');
    el.classList.add('cluster-clicked');
    window.setTimeout(() => {
      el.classList.remove('cluster-clicked');
      el.classList.add('cluster-opening');
    }, DISCOVERY_BLOOM_TIMING.CLUSTER_SCALE_UP);
    window.setTimeout(() => {
      el.classList.remove('cluster-opening');
      el.classList.add('cluster-collapsing', 'questory-cluster-fading');
    }, DISCOVERY_BLOOM_TIMING.CLUSTER_COLLAPSE);
  }, []);

  const handleClusterClick = useCallback((clusterId, coords) => {
    const map = mapRef.current;
    const source = map?.getSource(ADVENTURE_SOURCE);
    if (!map || !source) return;

    const animStart = Date.now();
    runClusterOpenAnimation(clusterId);

    source.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
      if (err || !leaves?.length) return;
      const leafMarkers = leaves
        .map((f) => markerLookupRef.current.get(f.properties?.id ?? f.id))
        .filter(Boolean);
      if (!leafMarkers.length) {
        if (isDev) {
          console.debug('[QuestoryMap]', {
            livingClusterClicked: { clusterId, count: 0, phase: 'failed', reason: 'noLeafMarkers' },
          });
        }
        return;
      }

      const meta = summarizeClusterMarkers(leafMarkers, mapStateRef.current);
      meta.count = leafMarkers.length;
      const categories = groupMarkersByCategory(leafMarkers, mapStateRef.current);
      const phase = categories.length === 1 ? 'adventure' : 'category';

      const payload = {
        clusterId,
        coords,
        markers: leafMarkers,
        meta,
        categories,
      };

      const elapsed = Date.now() - animStart;
      const delay = Math.max(0, DISCOVERY_BLOOM_TIMING.BLOSSOM_ENTER - elapsed);
      window.setTimeout(() => {
        if (isDev) {
          console.debug('[QuestoryMap]', {
            livingClusterClicked: { clusterId, count: meta.count, phase },
            discoveryBloomClusterOpen: { clusterId, count: meta.count, phase },
          });
        }
        playMapUiCue('clusterOpen');
        onClusterDiscoverRef.current?.(payload);
      }, delay);
    });
  }, [runClusterOpenAnimation]);

  handleClusterClickRef.current = handleClusterClick;

  const purgeLegacyBlossomMarkers = useCallback(() => {
    Object.keys(markersOnScreenRef.current).forEach((id) => {
      if (!id.startsWith('blossom-')) return;
      markersOnScreenRef.current[id].remove();
      delete markersOnScreenRef.current[id];
    });
  }, []);

  const guardLeftEdgeMarkers = useCallback((map) => {
    const container = map.getContainer();
    const mapWidth = container.clientWidth;
    const containerRect = container.getBoundingClientRect();
    let edgeCount = 0;
    const toRemove = [];

    Object.entries(markersOnScreenRef.current).forEach(([id, marker]) => {
      if (id.startsWith('cluster-') || id.startsWith('clue-') || id.startsWith('blossom-')) return;
      const el = marker.getElement?.();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = rect.left - containerRect.left + rect.width / 2;
      if (x <= 10 || x >= mapWidth - 10) {
        edgeCount += 1;
        toRemove.push(id);
      }
    });

    if (edgeCount > 3) {
      if (isDev) {
        console.debug('[QuestoryMap]', {
          leftEdgeMarkerGuardTriggered: { edgeCount, mapWidth, removed: toRemove.length },
        });
      }
      toRemove.forEach((id) => {
        markersOnScreenRef.current[id]?.remove();
        delete markersOnScreenRef.current[id];
      });
    }
  }, []);

  const syncHtmlMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(ADVENTURE_SOURCE)) return;

    purgeLegacyBlossomMarkers();

    const markers = adventureMarkersRef.current;
    const nextIds = new Set();
    let clusterCount = 0;
    const living = livingClusterRef.current;
    const suppressedId = living?.clusterId ?? null;
    const livingMemberIds =
      living && !living.overflowOpen
        ? new Set((living.markers || []).map((m) => m.id))
        : null;
    const mapMode = livingClusterPhase(living);
    const allowIndividualPins = mapMode === 'CLUSTER_VIEW';

    const reportStats = (pinCount) => {
      onVisiblePinCountChange?.(pinCount);
      onSpatialStatsChangeRef.current?.({
        adventureCount: markers.length,
        markerCount: markers.length,
        pinCount,
        clusterCount,
      });
    };

    const clusterFeatures = (() => {
      try {
        return map.queryRenderedFeatures({ layers: [MAP_LAYER_IDS.CLUSTERS] });
      } catch {
        return [];
      }
    })();
    clusterCount = clusterFeatures.length;

    for (const feature of clusterFeatures) {
      const props = parseFeatureProps(feature.properties);
      const coords = feature.geometry?.coordinates;
      if (!coords || props.cluster_id == null) continue;
      const count = props.point_count || 0;
      if (suppressedId != null && Number(props.cluster_id) === Number(suppressedId)) {
        upsertClusterMarker(
          map,
          props.cluster_id,
          coords,
          count,
          { dominant: { icon: '📍', label: 'Adventure' } },
          nextIds,
          { fading: living && !living.overflowOpen }
        );
        map.getSource(ADVENTURE_SOURCE).getClusterLeaves(props.cluster_id, 50, 0, (err, leaves) => {
          if (err || !leaves?.length) return;
          const leafMarkers = leaves
            .map((f) => markerLookupRef.current.get(f.properties?.id ?? f.id))
            .filter(Boolean);
          if (!leafMarkers.length) return;
          const meta = summarizeClusterMarkers(leafMarkers, mapStateRef.current);
          meta.count = count;
          upsertClusterMarker(map, props.cluster_id, coords, count, meta, nextIds, {
            fading: living && !living.overflowOpen,
          });
        });
        continue;
      }

      upsertClusterMarker(
        map,
        props.cluster_id,
        coords,
        count,
        { dominant: { icon: '📍', label: 'Adventure' } },
        nextIds
      );
      map.getSource(ADVENTURE_SOURCE).getClusterLeaves(props.cluster_id, 50, 0, (err, leaves) => {
        if (err || !leaves?.length) return;
        const leafMarkers = leaves
          .map((f) => markerLookupRef.current.get(f.properties?.id ?? f.id))
          .filter(Boolean);
        if (!leafMarkers.length) return;
        const meta = summarizeClusterMarkers(leafMarkers, mapStateRef.current);
        meta.count = count;
        upsertClusterMarker(map, props.cluster_id, coords, count, meta, nextIds);
      });
    }

    if (allowIndividualPins) {
      let unclusteredFeatures = [];
      try {
        unclusteredFeatures = map.queryRenderedFeatures({ layers: [MAP_LAYER_IDS.UNCLUSTERED] });
      } catch {
        unclusteredFeatures = [];
      }

      if (unclusteredFeatures.length === 0 && markers.length > 0 && clusterCount === 0) {
        for (const markerData of markers) {
          if (livingMemberIds?.has(markerData.id)) continue;
          upsertAdventurePin(
            map,
            markerData.id,
            [markerData.longitude, markerData.latitude],
            nextIds
          );
        }
      } else {
        for (const feature of unclusteredFeatures) {
          const props = parseFeatureProps(feature.properties);
          const coords = feature.geometry?.coordinates;
          if (!coords || isClusterFeature(props)) continue;
          const id = props.id ?? feature.id;
          if (!id || livingMemberIds?.has(id)) continue;
          upsertAdventurePin(map, id, coords, nextIds);
        }
      }
    }

    Object.keys(markersOnScreenRef.current).forEach((id) => {
      if (!nextIds.has(id)) {
        markersOnScreenRef.current[id].remove();
        delete markersOnScreenRef.current[id];
      }
    });

    let pinCount = [...nextIds].filter((id) => !String(id).startsWith('cluster-')).length;
    if (!pinCount && clusterCount > 0) pinCount = markers.length;
    reportStats(pinCount);
    guardLeftEdgeMarkers(map);
  }, [
    upsertAdventurePin,
    upsertClusterMarker,
    onVisiblePinCountChange,
    purgeLegacyBlossomMarkers,
    guardLeftEdgeMarkers,
  ]);

  syncHtmlMarkersRef.current = syncHtmlMarkers;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current || mini || mapInitFailed) return;

    if (!mapboxgl.supported()) {
      if (isDev) {
        console.debug('[QuestoryMap]', { mapboxInitFailed: 'WebGL not supported' });
      }
      setMapInitFailed(true);
      return;
    }

    let cancelled = false;

    mapboxgl.accessToken = token;
    const initialCenter =
      userLocation?.longitude != null
        ? [userLocation.longitude, userLocation.latitude]
        : [-95.261, 37.3392];

    if (userLocation?.latitude != null) {
      cameraRef.current.state.initialUserCentered = true;
    }

    let map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: initialCenter,
        zoom: userLocation ? 13 : 11,
        attributionControl: true,
        failIfMajorPerformanceCaveat: false,
      });
    } catch (err) {
      if (isDev) {
        console.debug('[QuestoryMap]', { mapboxInitFailed: err?.message || 'Map creation failed' });
      }
      setMapInitFailed(true);
      return;
    }

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    const detachCameraHandlers = cameraRef.current.attachInteractionHandlers(map);

    map.on('error', (e) => {
      const msg = e?.error?.message || '';
      if (/webgl/i.test(msg)) {
        if (isDev) {
          console.debug('[QuestoryMap]', { mapboxInitFailed: msg });
        }
        setMapInitFailed(true);
      }
    });

    map.on('load', () => {
      if (cancelled) return;
      mapReadyRef.current = true;

      if (isDev) {
        console.debug('[QuestoryMap]', { mapCreated: true });
      }

      map.addSource(MAP_SOURCE_IDS.REVEALED, {
        type: 'geojson',
        data: revealedAreasGeoJSON(mapExploration, mapWorldNow),
      });
      map.addLayer({
        id: 'revealed-fill',
        type: 'fill',
        source: MAP_SOURCE_IDS.REVEALED,
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': ['coalesce', ['get', 'clearOpacity'], 0.08],
        },
      });
      map.addLayer({
        id: 'revealed-outline',
        type: 'line',
        source: MAP_SOURCE_IDS.REVEALED,
        paint: {
          'line-color': '#5eead4',
          'line-opacity': ['*', ['coalesce', ['get', 'clearOpacity'], 0.35], 0.85],
          'line-width': 1,
        },
      });

      map.addSource(ADVENTURE_SOURCE, {
        type: 'geojson',
        data: geoJson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48,
        clusterProperties: {
          hasEvent: ['max', ['get', 'hasEvent']],
          hasFeatured: ['max', ['get', 'hasFeatured']],
          hasLegendary: ['max', ['get', 'hasLegendary']],
        },
      });

      addAdventureClusterLayers(map);
      setupAdventureLayerInteractions(map, {
        getMarkerById: (id) => markerLookupRef.current.get(id),
        getMapState: () => mapStateRef.current,
        getHeatZones: () => heatZonesRef.current,
      });

      map.on('click', MAP_LAYER_IDS.CLUSTERS, (e) => {
        e.originalEvent?.stopPropagation?.();
        const props = parseFeatureProps(e.features?.[0]?.properties);
        const coords = e.features?.[0]?.geometry?.coordinates;
        if (props.cluster_id == null || !coords) return;
        handleClusterClickRef.current?.(props.cluster_id, coords);
      });

      map.on('click', (e) => {
        const target = e.originalEvent?.target;
        if (
          target?.closest?.(
            '.questory-cluster, .questory-pin, .blossom-pin, .blossom-category, .blossom-overflow, .living-cluster-blossom, .map-pin-card, .questory-map-card, .cluster-adventure-picker'
          )
        ) {
          return;
        }
        try {
          const hit = map.queryRenderedFeatures(e.point, { layers: [MAP_LAYER_IDS.CLUSTERS] });
          if (hit.length > 0) return;
        } catch {
          /* ignore */
        }
        if (isDev) {
          console.debug('[QuestoryMap]', { mapBackgroundCollapsed: true });
        }
        onMapBackgroundClickRef.current?.();
      });

      map.on('moveend', syncHtmlMarkers);
      map.on('zoomend', () => {
        syncHtmlMarkers();
        onMapZoomChangeRef.current?.(map.getZoom());
      });
      map.on('sourcedata', (e) => {
        if (e.sourceId === ADVENTURE_SOURCE && e.isSourceLoaded) syncHtmlMarkers();
      });

      syncHtmlMarkers();
      onMapZoomChangeRef.current?.(map.getZoom());
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      detachCameraHandlers?.();
      mapReadyRef.current = false;
      Object.values(markersOnScreenRef.current).forEach((m) => m.remove());
      markersOnScreenRef.current = {};
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (isDev) {
        console.debug('[QuestoryMap]', { mapRemoved: true });
      }
      map.remove();
      mapRef.current = null;
    };
  }, [token, mini, mapInitFailed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || mini) return;
    const src = map.getSource(ADVENTURE_SOURCE);
    if (src) {
      src.setData(geoJson);
      syncHtmlMarkers();
    }
  }, [geoJson, syncHtmlMarkers, mini]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || mini) return;
    const src = map.getSource(MAP_SOURCE_IDS.REVEALED);
    if (src) src.setData(revealedAreasGeoJSON(mapExploration, mapWorldNow));
  }, [mapExploration, mapWorldNow, mini]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || mini || !showUserLocation) return;

    if (userLocation?.latitude == null) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({
        element: createUserLocationElement(),
        anchor: 'center',
      })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    }
  }, [userLocation, showUserLocation, mini]);

  useEffect(() => {
    const map = mapRef.current;
    const cam = cameraRef.current;
    if (!map || mini || !mapReadyRef.current || !cam) return;
    const loc = userLocationRef.current;
    if (loc?.latitude == null || cam.state.initialUserCentered) return;
    cam.state.initialUserCentered = true;
    requestCameraMoveRef.current?.('initialUser', (m) => {
      flyMapTo(m, {
        center: [loc.longitude, loc.latitude],
        zoom: 13,
        duration: 900,
      });
    });
  }, [userLocation, mini]);

  const lastFindMeSignalRef = useRef(0);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mini || !findMeSignal || findMeSignal === lastFindMeSignalRef.current) return;
    lastFindMeSignalRef.current = findMeSignal;
    const loc = userLocationRef.current;
    if (loc?.latitude == null) return;
    requestCameraMoveRef.current?.('findMe', (m) => {
      flyMapTo(m, {
        center: [loc.longitude, loc.latitude],
        zoom: 14,
        duration: 900,
      });
    });
  }, [findMeSignal, mini]);

  useEffect(() => {
    if (mini || !mapReady || !onMapFlyReady) return undefined;
    onMapFlyReady({
      flyTo: ({ latitude, longitude, zoom = 10 }) => {
        const map = mapRef.current;
        if (!map || latitude == null || longitude == null) return;
        requestCameraMoveRef.current?.('earthFly', (m) => {
          flyMapTo(m, {
            center: [longitude, latitude],
            zoom,
            duration: 1400,
          });
        });
      },
    });
    return () => onMapFlyReady(null);
  }, [mapReady, mini, onMapFlyReady]);

  useEffect(() => {
    if (mini || !mapRef.current) return;
    syncHtmlMarkers();
  }, [selectedAdventureId, livingCluster, syncHtmlMarkers, mini]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mini) return;

    clueMarkers.forEach((marker) => {
      const id = `clue-${marker.id}`;
      if (markersOnScreenRef.current[id]) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `mapbox-marker clue-marker ${marker.active ? 'active' : ''}`;
      el.innerHTML = `<span class="marker-num">${marker.index}</span>`;
      el.addEventListener('click', () => onClueClick?.(marker));
      markersOnScreenRef.current[id] = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);
    });
  }, [clueMarkers, onClueClick, mini]);

  if (!token || mapInitFailed) {
    return (
      <FallbackMap
        adventureMarkers={adventureMarkers}
        clueMarkers={clueMarkers}
        onAdventureClick={onAdventureClick}
        onClueClick={onClueClick}
        mini={mini}
        className={className}
        notice={mapInitFailed ? MAPBOX_WEBGL_FALLBACK_MESSAGE : MAPBOX_FALLBACK_MESSAGE}
      />
    );
  }

  return (
    <div className={`questory-map-wrap ${mini ? 'mini' : ''} ${className}`}>
      <div ref={containerRef} className={`questory-map ${mini ? 'mini' : ''}`} />
      {!mini && mapReady && mapRef.current && livingWorld && (
        <>
          <ProgressiveLayer layerId={WORLD_LAYER_IDS.EXPLORER} layers={progressiveLayers}>
            <LivingWorldLayer
              map={mapRef.current}
              explorerDots={livingWorld.explorerDots}
              heatZones={livingWorld.heatZones}
              atmosphereClass={livingWorld.atmosphereClass}
              revealedCount={livingWorld.revealedCount}
              fogDecayLevel={livingWorld.fogDecayLevel}
              nightMode={livingWorld.nightMode}
            />
          </ProgressiveLayer>
          <ProgressiveLayer layerId={WORLD_LAYER_IDS.GUILD} layers={progressiveLayers}>
            {socialDiscovery?.territoryOverlays?.length > 0 && (
              <TerritoryLayer
                map={mapRef.current}
                overlays={socialDiscovery.territoryOverlays}
                onTerritorySelect={onTerritorySelect}
              />
            )}
            {socialDiscovery?.raceMarkers?.length > 0 && (
              <SocialRaceLayer map={mapRef.current} markers={socialDiscovery.raceMarkers} />
            )}
          </ProgressiveLayer>
          <ProgressiveLayer layerId={WORLD_LAYER_IDS.NPC} layers={progressiveLayers}>
            {questoryIdentity?.bossMarker && (
              <WorldBossLayer map={mapRef.current} marker={questoryIdentity.bossMarker} />
            )}
            {questoryIdentity?.arMarkers?.length > 0 && (
              <ArTreasureLayer map={mapRef.current} markers={questoryIdentity.arMarkers} />
            )}
          </ProgressiveLayer>
          <ProgressiveLayer layerId={WORLD_LAYER_IDS.CITIES} layers={progressiveLayers}>
            {worldDiscovery?.cityRings?.length > 0 && (
              <CityDiscoveryRingLayer
                map={mapRef.current}
                rings={worldDiscovery.cityRings}
                minZoom={8}
              />
            )}
          </ProgressiveLayer>
          <ProgressiveLayer layerId={WORLD_LAYER_IDS.DISCOVERY} layers={progressiveLayers}>
            <DiscoveryTrailLayer map={mapRef.current} trail={livingWorld.discoveryTrail} />
            <MapDiscoveryPulse map={mapRef.current} pulses={livingWorld.pulses} />
          </ProgressiveLayer>
        </>
      )}
      {!mini && mapReady && livingCluster && !livingCluster.overflowOpen && mapRef.current && (
        <LivingClusterBlossomOverlay
          map={mapRef.current}
          livingCluster={livingCluster}
          mapState={mapState}
          accessOptions={{
            userLatitude: userLocation?.latitude,
            userLongitude: userLocation?.longitude,
            isAdmin,
            userId,
          }}
          onCategorySelect={onBlossomCategorySelect}
          onPinSelect={onBlossomPinSelect}
          onOverflow={onBlossomOverflow}
          onHoverChange={onPinHoverChange}
        />
      )}
    </div>
  );
}

export function MapScreen({
  adventures,
  nav,
  state,
  setState,
  isAdmin = false,
  userId = null,
  shellMode = false,
  onProgressiveLayersChange = null,
}) {
  const [activeFilter, setActiveFilter] = useState(MAP_FILTERS.ALL);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [livingCluster, setLivingCluster] = useState(null);
  const [cardEntering, setCardEntering] = useState(false);
  const [pulseTrigger, setPulseTrigger] = useState(null);
  const [worldNow, setWorldNow] = useState(() => Date.now());
  const [mapZoom, setMapZoom] = useState(11);
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false);
  const milestonesSeenRef = useRef([]);
  const earthFlyRef = useRef(null);
  const prevMapZoomRef = useRef(mapZoom);
  const [focusedAdventure, setFocusedAdventure] = useState(null);
  const [findMeSignal, setFindMeSignal] = useState(0);
  const [visiblePinCount, setVisiblePinCount] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [spatialStats, setSpatialStats] = useState(null);
  const { location } = usePlayerLocation();
  const visibility = state?.social?.visibility || VISIBILITY_MODES.TEAM;
  const follows = state?.economy?.follows || [];

  useEffect(() => {
    const tick = window.setInterval(() => setWorldNow(Date.now()), 60000);
    return () => window.clearInterval(tick);
  }, []);

  const accessOptions = {
    userLatitude: location?.latitude,
    userLongitude: location?.longitude,
    isAdmin,
    userId,
    state,
  };

  const filteredAdventures = useMemo(
    () =>
      filterMapAdventures(adventures, activeFilter, {
        state,
        userLat: location?.latitude,
        userLng: location?.longitude,
        follows,
      }),
    [adventures, activeFilter, state, location, follows]
  );

  const visibleAdventures = useMemo(() => {
    const events = getLivingWorldEventsSnapshot(filteredAdventures, { state, now: worldNow });
    const visible = new Set(events.visibleAdventureIds);
    return filteredAdventures.filter((a) => visible.has(a.id));
  }, [filteredAdventures, state, worldNow]);

  const adventureMarkers = buildAdventureMarkers(visibleAdventures, accessOptions);
  const clueMarkers = focusedAdventure ? buildClueMarkers(focusedAdventure) : [];

  const livingWorld = useMemo(
    () =>
      getLivingWorldSnapshot(visibleAdventures, {
        state,
        adventureMarkers,
        userLocation: location,
        pulseTrigger,
        now: worldNow,
      }),
    [visibleAdventures, state, adventureMarkers, location, pulseTrigger, worldNow]
  );

  const socialDiscoverySnapshot = useMemo(
    () =>
      getSocialDiscoverySnapshot(state, visibleAdventures, {
        timeline: livingWorld.timeline,
        now: worldNow,
      }),
    [state, visibleAdventures, livingWorld.timeline, worldNow]
  );

  const questoryIdentitySnapshot = useMemo(
    () => getQuestoryIdentitySnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const legendaryHuntSnapshot = useMemo(
    () => getLegendaryHuntSnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const factionSnapshot = useMemo(
    () => getFactionSnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const mergedRaces = useMemo(() => {
    const seen = new Set();
    return [...legendaryHuntSnapshot.races, ...socialDiscoverySnapshot.races].filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).slice(0, 6);
  }, [legendaryHuntSnapshot.races, socialDiscoverySnapshot.races]);

  const mergedSocialDiscovery = useMemo(
    () => ({
      ...socialDiscoverySnapshot,
      races: mergedRaces,
      raceMarkers: buildRaceMarkers(mergedRaces),
      territoryOverlays: factionSnapshot.mapOverlays?.length
        ? factionSnapshot.mapOverlays
        : socialDiscoverySnapshot.territoryOverlays,
    }),
    [socialDiscoverySnapshot, mergedRaces, factionSnapshot.mapOverlays]
  );

  const handleTerritorySelect = useCallback(
    (territoryId) => {
      if (!setState) return;
      setState((s) => ({
        ...s,
        screen: 'social',
        socialTab: 'guild',
        guildTab: 'territories',
        faction: {
          ...s.faction,
          focusedTerritoryId: territoryId,
        },
      }));
    },
    [setState]
  );

  const worldDiscoverySnapshot = useMemo(
    () =>
      getWorldDiscoverySnapshot({
        zoom: mapZoom,
        state,
        adventures,
        fog: livingWorld.exploration,
        now: worldNow,
        previousMilestones: milestonesSeenRef.current,
      }),
    [mapZoom, state, adventures, livingWorld.exploration, worldNow]
  );

  const livingEarthSnapshot = useMemo(
    () =>
      getLivingEarthSnapshot({
        zoom: mapZoom,
        state,
        adventures,
        fog: livingWorld.exploration,
        now: worldNow,
        previousMilestones: milestonesSeenRef.current,
        worldDiscovery: worldDiscoverySnapshot,
      }),
    [mapZoom, state, adventures, livingWorld.exploration, worldNow, worldDiscoverySnapshot]
  );

  const handleEarthFlyTo = useCallback((target) => {
    earthFlyRef.current?.flyTo?.(target);
  }, []);

  const handleReturnToMap = useCallback(
    ({ zoom = 13 } = {}) => {
      const latitude = location?.latitude ?? 37.3392;
      const longitude = location?.longitude ?? -95.261;
      earthFlyRef.current?.flyTo?.({ latitude, longitude, zoom });
    },
    [location]
  );

  useEffect(() => {
    const prev = prevMapZoomRef.current;
    if (prev <= EARTH_MODE_EXIT_ZOOM && mapZoom > EARTH_MODE_EXIT_ZOOM) {
      if (isDev) {
        console.log('livingEarthExitByZoom', { zoom: mapZoom, previousZoom: prev });
      }
    }
    prevMapZoomRef.current = mapZoom;
  }, [mapZoom]);

  const earthOverlayVisible = livingEarthSnapshot.overlayVisible ?? livingEarthSnapshot.earthMode;

  const layerSnapshot = useMemo(
    () =>
      getProgressiveLayerSnapshot({
        zoom: mapZoom,
        earthOverlayVisible,
        fullEarth: livingEarthSnapshot.fullEarth,
        shellMode,
      }),
    [mapZoom, earthOverlayVisible, livingEarthSnapshot.fullEarth, shellMode]
  );

  useEffect(() => {
    onProgressiveLayersChange?.(layerSnapshot);
  }, [layerSnapshot, onProgressiveLayersChange]);

  useEffect(() => {
    if (worldDiscoverySnapshot.milestones?.length) {
      milestonesSeenRef.current = [
        ...milestonesSeenRef.current,
        ...worldDiscoverySnapshot.milestones,
      ].slice(-20);
      setCeremonyDismissed(false);
    }
  }, [worldDiscoverySnapshot.milestones]);

  const creatorEconomySnapshot = useMemo(
    () => getCreatorEconomySnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const marketplaceSnapshot = useMemo(
    () => getMarketplaceSnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const aiNpcSnapshot = useMemo(
    () => getAiNpcSnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const dynamicStorySnapshot = useMemo(
    () => getDynamicStorySnapshot(state, adventures, { now: worldNow }),
    [state, adventures, worldNow]
  );

  const livePresence = useMemo(
    () => ({
      ...livingWorld.presence,
      activeHunts: Math.max(
        livingWorld.presence.activeHunts,
        socialDiscoverySnapshot.presenceBoost?.activeHunts ?? 0
      ),
      teamsCompeting: Math.max(
        livingWorld.presence.teamsCompeting,
        socialDiscoverySnapshot.presenceBoost?.teamsCompeting ?? 0
      ),
    }),
    [livingWorld.presence, socialDiscoverySnapshot]
  );

  const activityBanners = useMemo(() => {
    const raceBanners = buildRaceActivityBanners(mergedRaces);
    const identityBanners = questoryIdentitySnapshot.banners || [];
    const legendaryBanners = (legendaryHuntSnapshot.alerts || []).map((a) => ({
      id: a.id,
      icon: a.icon,
      text: `${a.title} — ${a.body}`,
      kind: 'legendary',
      priority: a.priority ?? 95,
      ttlMs: a.ttlMs ?? 15000,
    }));
    const merged = [
      ...(livingWorld.ambientBanners || []),
      ...legendaryBanners,
      ...identityBanners,
      ...raceBanners,
    ];
    const seen = new Set();
    return merged
      .filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      })
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }, [
    livingWorld.ambientBanners,
    questoryIdentitySnapshot.banners,
    mergedRaces,
    legendaryHuntSnapshot.alerts,
  ]);

  const mapNotificationSnapshot = useMemo(() => {
    const legacyNotes = [...(socialDiscoverySnapshot.toasts || []), ...(livingWorld.notifications || [])]
      .filter((n, idx, arr) => arr.findIndex((x) => x.id === n.id) === idx)
      .map((n) =>
        normalizeSmartNotification({
          id: n.id,
          priority: n.priority,
          title: n.title,
          text: n.body || n.text,
          icon: n.icon,
          kind: n.kind,
          action: n.kind === 'legendary' ? 'legendary-hunt' : n.kind === 'race' ? 'map' : null,
        })
      );

    return getSmartNotificationSnapshot({
      state,
      adventures,
      now: worldNow,
      layerSnapshot: shellMode ? layerSnapshot : null,
      socialToasts: socialDiscoverySnapshot.toasts || [],
      extra: legacyNotes,
    });
  }, [
    state,
    adventures,
    worldNow,
    shellMode,
    layerSnapshot,
    socialDiscoverySnapshot.toasts,
    livingWorld.notifications,
  ]);

  const timelineEntries = useMemo(() => {
    const merged = [...livingWorld.timeline];
    [...socialDiscoverySnapshot.feed, ...(questoryIdentitySnapshot.feed || [])].forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({ ...item, kind: item.kind || 'social' });
      }
    });
    worldDiscoverySnapshot.timelineEntries.forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({ ...item, kind: item.kind || 'milestone' });
      }
    });
    (legendaryHuntSnapshot.timeline || []).forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({ ...item, kind: item.kind || 'boss' });
      }
    });
    (creatorEconomySnapshot.timelineFeed || []).forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({
          ...item,
          kind: item.kind || 'creator',
          text: item.text,
          label: item.text,
          minutesAgo: 2,
        });
      }
    });
    (marketplaceSnapshot.activityFeed || []).forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({
          ...item,
          kind: item.kind || 'market',
          text: item.text,
          label: item.text,
          minutesAgo: 1,
        });
      }
    });
    (aiNpcSnapshot.timelineFeed || []).forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({
          ...item,
          kind: item.kind || 'npc',
          text: item.text,
          label: item.text,
          minutesAgo: item.minutesAgo ?? 2,
        });
      }
    });
    (dynamicStorySnapshot.timelineFeed || []).forEach((item) => {
      if (!merged.some((e) => e.id === item.id)) {
        merged.push({
          ...item,
          kind: item.kind || 'story',
          text: item.text,
          label: item.text,
          minutesAgo: item.minutesAgo ?? 4,
        });
      }
    });
    return merged
      .sort((a, b) => (a.minutesAgo ?? 99) - (b.minutesAgo ?? 99))
      .slice(0, 16);
  }, [
    livingWorld.timeline,
    socialDiscoverySnapshot.feed,
    questoryIdentitySnapshot.feed,
    worldDiscoverySnapshot.timelineEntries,
    legendaryHuntSnapshot.timeline,
    creatorEconomySnapshot.timelineFeed,
    marketplaceSnapshot.activityFeed,
    aiNpcSnapshot.timelineFeed,
    dynamicStorySnapshot.timelineFeed,
  ]);

  const pinStats = useMemo(
    () => computeMapPinStats(adventures, adventureMarkers, accessOptions),
    [adventures, adventureMarkers, accessOptions]
  );

  const showPinDebugLine = hasMapboxToken() && pinStats.pinCount === 0;
  const showMapFallbackList =
    hasMapboxToken() &&
    !focusedAdventure &&
    adventureMarkers.length > 0 &&
    visiblePinCount === 0 &&
    pinStats.pinCount > 0;

  useEffect(() => {
    if (!isDev) return;
    console.debug('[QuestoryMap]', {
      renderedPins: visiblePinCount ?? adventureMarkers.length,
      selectedPinId: selectedMarker?.id ?? null,
      hoveredPinId,
      adventureCount: adventures.length,
      markerCount: adventureMarkers.length,
      filteredCount: filteredAdventures.length,
      clusterCount: spatialStats?.clusterCount ?? 0,
      mapMode: livingClusterPhase(livingCluster),
      livingClusterId: livingCluster?.clusterId ?? null,
      missingCoords: pinStats.missingCoords,
      accessFiltered: pinStats.accessFiltered,
    });
  }, [
    visiblePinCount,
    adventureMarkers.length,
    selectedMarker?.id,
    hoveredPinId,
    adventures.length,
    filteredAdventures.length,
    spatialStats,
    pinStats,
    livingCluster,
  ]);

  const selectedAdventure = selectedMarker?.adventure || null;
  const selectedAccess = useMemo(() => {
    if (!selectedAdventure) return null;
    return (
      selectedMarker?.access ||
      evaluateAccessContext(selectedAdventure, { ...accessOptions, adminPreview: false })
    );
  }, [selectedAdventure, selectedMarker?.access, accessOptions]);
  const pinVisual = selectedAdventure ? resolvePinVisual(selectedAdventure, state) : null;

  const clusterDistanceM =
    livingCluster?.coords && location?.latitude != null
      ? haversineDistanceMeters(
          location.latitude,
          location.longitude,
          livingCluster.coords[1],
          livingCluster.coords[0]
        )
      : null;

  const overflowPickerMarkers =
    livingCluster?.overflowOpen && livingCluster.activeMarkers?.length
      ? livingCluster.activeMarkers.slice(BLOSSOM_MAX_PINS)
      : [];

  useEffect(() => {
    if (!isDev) return;
    console.debug('[QuestoryMap]', {
      mapModeChanged: livingClusterPhase(livingCluster),
      livingClusterId: livingCluster?.clusterId ?? null,
    });
  }, [livingCluster]);

  function handleLivingClusterCollapse() {
    if (isDev) {
      console.debug('[QuestoryMap]', {
        mapBackgroundCollapsed: true,
        discoveryBloomCollapsed: true,
      });
    }
    setLivingCluster(null);
    setSelectedMarker(null);
    setHoveredPinId(null);
    setCardEntering(false);
  }

  function handleClusterDiscover(payload) {
    setSelectedMarker(null);
    const { categories, coords } = payload;
    if (coords) {
      triggerDiscoveryPulse(setPulseTrigger, {
        latitude: coords[1],
        longitude: coords[0],
        label: 'Cluster discovered',
        kind: 'discovered',
      });
    }
    if (categories.length === 1) {
      if (isDev) {
        console.debug('[QuestoryMap]', {
          livingClusterClicked: {
            clusterId: payload.clusterId,
            count: payload.meta?.count ?? payload.markers.length,
            phase: 'adventure',
          },
          adventureBlossomOpened: { categoryId: categories[0].id, count: categories[0].markers.length },
        });
      }
      setLivingCluster({
        clusterId: payload.clusterId,
        coords: payload.coords,
        markers: payload.markers,
        meta: payload.meta,
        categories,
        phase: 'adventure',
        categoryId: categories[0].id,
        activeMarkers: payload.markers,
        selectedId: null,
        overflowOpen: false,
      });
      return;
    }

    if (isDev) {
      console.debug('[QuestoryMap]', {
        livingClusterClicked: {
          clusterId: payload.clusterId,
          count: payload.meta?.count ?? payload.markers.length,
          phase: 'category',
        },
        categoryBlossomOpened: { categories: categories.length },
      });
    }

    setLivingCluster({
      clusterId: payload.clusterId,
      coords: payload.coords,
      markers: payload.markers,
      meta: payload.meta,
      categories,
      phase: 'category',
      categoryId: null,
      activeMarkers: [],
      selectedId: null,
      overflowOpen: false,
    });
  }

  function handleBlossomCategorySelect(categoryId) {
    if (!livingCluster) return;
    const cat = livingCluster.categories.find((c) => c.id === categoryId);
    if (!cat) return;

    playMapUiCue('categorySelect');
    if (isDev) {
      console.debug('[QuestoryMap]', {
        discoveryBloomCategorySelect: { categoryId, count: cat.markers.length },
      });
    }

    setLivingCluster((lc) => (lc ? { ...lc, categoryTransition: categoryId } : lc));

    window.setTimeout(() => {
      setLivingCluster((lc) => {
        if (!lc) return lc;
        const selected = lc.categories.find((c) => c.id === categoryId);
        if (!selected) return lc;
        if (isDev) {
          console.debug('[QuestoryMap]', {
            adventureBlossomOpened: { categoryId, count: selected.markers.length },
          });
        }
        return {
          ...lc,
          phase: 'adventure',
          categoryId,
          activeMarkers: selected.markers,
          selectedId: null,
          categoryTransition: null,
          pinSelecting: false,
        };
      });
    }, DISCOVERY_BLOOM_TIMING.CATEGORY_SELECT_MS);
  }

  function openCardFromBlossomPin(marker) {
    if (!livingCluster) return;
    const clusterId = livingCluster.clusterId;
    if (marker.latitude != null && marker.longitude != null) {
      triggerDiscoveryPulse(setPulseTrigger, {
        latitude: marker.latitude,
        longitude: marker.longitude,
        label: marker.title || 'Adventure found',
        kind: 'selected',
      });
    }
    setLivingCluster((lc) =>
      lc ? { ...lc, selectedId: marker.id, pinSelecting: true } : lc
    );
    window.setTimeout(() => {
      playMapUiCue('cardOpen');
      if (isDev) {
        console.debug('[QuestoryMap]', {
          discoveryBloomCardOpen: { adventureId: marker.id, title: marker.title },
        });
      }
      setCardEntering(true);
      handleAdventureClick(marker.adventure, {
        ...marker,
        fromCluster: true,
        clusterId,
      });
      window.setTimeout(() => setCardEntering(false), 420);
    }, DISCOVERY_BLOOM_TIMING.CARD_OPEN);
  }

  function handleBlossomPinSelect(marker) {
    if (!livingCluster) return;
    playMapUiCue('adventureSelect');
    if (isDev) {
      console.debug('[QuestoryMap]', {
        discoveryBloomAdventureSelect: { adventureId: marker.id, title: marker.title },
      });
    }
    openCardFromBlossomPin(marker);
  }

  function handleBlossomOverflow() {
    setLivingCluster((lc) => (lc ? { ...lc, overflowOpen: true } : lc));
  }

  function handleOverflowPickerClose() {
    setLivingCluster((lc) => (lc ? { ...lc, overflowOpen: false } : lc));
  }

  function handleOverflowAdventureSelect(marker) {
    if (!livingCluster) return;
    const clusterId = livingCluster.clusterId;
    if (marker.latitude != null && marker.longitude != null) {
      triggerDiscoveryPulse(setPulseTrigger, {
        latitude: marker.latitude,
        longitude: marker.longitude,
        label: marker.title || 'Adventure found',
        kind: 'selected',
      });
    }
    setLivingCluster((lc) =>
      lc
        ? {
            ...lc,
            overflowOpen: false,
            selectedId: marker.id,
            pinSelecting: true,
          }
        : lc
    );
    playMapUiCue('adventureSelect');
    if (isDev) {
      console.debug('[QuestoryMap]', {
        discoveryBloomAdventureSelect: { adventureId: marker.id, title: marker.title, fromOverflow: true },
      });
    }
    window.setTimeout(() => {
      playMapUiCue('cardOpen');
      if (isDev) {
        console.debug('[QuestoryMap]', {
          discoveryBloomCardOpen: { adventureId: marker.id, title: marker.title },
        });
      }
      setCardEntering(true);
      handleAdventureClick(marker.adventure, {
        ...marker,
        fromCluster: true,
        clusterId,
      });
      window.setTimeout(() => setCardEntering(false), 420);
    }, DISCOVERY_BLOOM_TIMING.CARD_OPEN);
  }

  function handleMapBackgroundClick() {
    handleLivingClusterCollapse();
  }

  const filterCounts = useMemo(() => {
    const counts = { all: adventures.length };
    [
      MAP_FILTERS.HORROR,
      MAP_FILTERS.FAMILY,
      MAP_FILTERS.HISTORY,
      MAP_FILTERS.CHURCH,
      MAP_FILTERS.SPONSOR,
      MAP_FILTERS.EVENTS,
      MAP_FILTERS.FRIENDS,
      MAP_FILTERS.NEAR_ME,
    ].forEach((f) => {
      counts[f] = filterMapAdventures(adventures, f, {
        state,
        userLat: location?.latitude,
        userLng: location?.longitude,
        follows,
      }).length;
    });
    return counts;
  }, [adventures, state, location, follows]);

  function handleAdventureClick(adventure, marker) {
    setHoveredPinId(null);
    setSelectedMarker(marker || { adventure, id: adventure.id });
    setFocusedAdventure(null);
    if (setState) {
      setState((s) => recordMapReveal(s, adventure));
    }
  }

  function handleCardClose() {
    handleLivingClusterCollapse();
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return;
      if (selectedMarker || livingCluster) handleLivingClusterCollapse();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedMarker, livingCluster]);

  function handleViewClues(adventure, access) {
    if (!adventure?.id || !nav) return;
    const previewMode = Boolean(access?.tooFar || access?.mode === 'preview' || !access?.canPlayFull);
    if (isDev) {
      console.debug('[MapPinCard]', {
        mapCardCtaClicked: true,
        adventureId: adventure.id,
        accessMode: access?.mode,
        targetScreen: 'detail',
        previewMode,
        action: 'viewClueTrail',
      });
    }
    nav('detail', adventure.id, { adminPreview: false, previewMode });
  }

  function handleMapCardPlay(adventure, access) {
    if (!adventure?.id || !nav) return;
    const previewMode = Boolean(access?.tooFar || access?.mode === 'preview' || !access?.canPlayFull);
    const targetScreen = previewMode ? 'detail' : 'play';

    if (isDev) {
      console.debug('[MapPinCard]', {
        mapCardPrimaryCtaClicked: { adventureId: adventure.id, accessMode: access?.mode, targetScreen, previewMode },
      });
    }

    nav(targetScreen, adventure.id, { adminPreview: false, previewMode });
  }

  function handleMapCardPreview(adventure, access) {
    if (!adventure?.id || !nav) return;
    const previewMode = Boolean(access?.tooFar || access?.mode === 'preview' || !access?.canPlayFull);
    if (isDev) {
      console.debug('[MapPinCard]', {
        mapCardPrimaryCtaClicked: { adventureId: adventure.id, accessMode: access?.mode, targetScreen: 'detail', previewMode: true },
      });
    }
    nav('detail', adventure.id, { adminPreview: false, previewMode: true });
  }

  return (
    <>
      {!shellMode && (
        <div className="section-head map-section-head">
          <div>
            <h2>Adventure Map</h2>
            <p>
              {hasMapboxToken()
                ? 'Tap clusters to uncover adventures · blossom reveals secrets nearby'
                : 'Trail list · add VITE_MAPBOX_TOKEN for live map'}
            </p>
          </div>
          {location?.latitude != null && (
            <button
              type="button"
              className="ghost map-find-me-btn"
              onClick={() => {
                handleReturnToMap({ zoom: 14 });
                setFindMeSignal((n) => n + 1);
              }}
            >
              <LocateFixed size={16} /> Find Me
            </button>
          )}
        </div>
      )}

      <MapFilterBar
        activeFilter={activeFilter}
        onChange={setActiveFilter}
        counts={filterCounts}
        className={shellMode ? 'map-shell-filter' : ''}
      />

      {shellMode && location?.latitude != null && (
        <button
          type="button"
          className="ghost map-find-me-btn map-shell-find-me"
          onClick={() => {
            handleReturnToMap({ zoom: 14 });
            setFindMeSignal((n) => n + 1);
          }}
        >
          <LocateFixed size={16} /> Find Me
        </button>
      )}

      {!shellMode && state && setState && (
        <LiveMapOverlay
          presence={livePresence}
          socialDiscovery={mergedSocialDiscovery}
          visibility={visibility}
          onVisibilityChange={(mode) =>
            setState((s) => ({
              ...s,
              social: { ...s.social, visibility: mode },
            }))
          }
        />
      )}

      {!shellMode && <DiscoveredWorldPanel snapshot={worldDiscoverySnapshot} />}

      {!shellMode && (
        <QuestoryIdentityPanel
          identity={questoryIdentitySnapshot}
          onNavigateLeaderboard={nav ? () => nav('leaderboard') : null}
          onOpenLegendaryHunt={nav ? () => nav('legendary-hunt') : null}
        />
      )}

      {!shellMode && (
        <LivingWorldTimeline
          entries={timelineEntries}
          races={mergedRaces}
          boss={questoryIdentitySnapshot.boss}
        />
      )}

      <div
        className={`map-stage map-stage-has-discovery-hud${shellMode ? ' map-stage-world-shell map-stage-world-layers' : ''}${shellMode && layerSnapshot.className ? ` ${layerSnapshot.className}` : ''}${livingCluster ? ' map-stage-living-cluster' : ''}${selectedAdventure ? ' map-stage-adventure-active' : ''}${livingWorld.nightMode ? ' map-stage-night' : ''}${legendaryHuntSnapshot.atmosphere?.className ? ` ${legendaryHuntSnapshot.atmosphere.className}` : ''}${earthOverlayVisible ? ' map-stage-earth-mode' : ''}${livingEarthSnapshot.fullEarth ? ' map-stage-earth-mode-full' : ''}`}
        style={shellMode ? layerSnapshot.style : undefined}
      >
        <ProgressiveLayer layerId={WORLD_LAYER_IDS.DISCOVERY} layers={shellMode ? layerSnapshot.layers : null}>
          {!earthOverlayVisible && <LegendaryHuntMapHud snapshot={legendaryHuntSnapshot} />}
          {!earthOverlayVisible && (
            <DiscoveryHud
              snapshot={worldDiscoverySnapshot}
              compact={Boolean(livingCluster || selectedAdventure)}
            />
          )}
        </ProgressiveLayer>
        {!ceremonyDismissed && worldDiscoverySnapshot.ceremony && (
          <DiscoveryCeremonyToast
            ceremony={worldDiscoverySnapshot.ceremony}
            onDismiss={() => setCeremonyDismissed(true)}
          />
        )}
        <ProgressiveLayer layerId={WORLD_LAYER_IDS.EXPLORER} layers={shellMode ? layerSnapshot.layers : null}>
          {!earthOverlayVisible && (
            <LivingWorldActivityFeed
              banners={activityBanners}
              paused={Boolean(livingCluster || selectedAdventure)}
            />
          )}
          <LivingWorldNotifications snapshot={mapNotificationSnapshot} nav={nav} />
        </ProgressiveLayer>

        <QuestoryMap
          adventureMarkers={focusedAdventure ? [] : adventureMarkers}
          clueMarkers={clueMarkers}
          onAdventureClick={handleAdventureClick}
          onClueClick={(marker) => handleViewClues(marker.adventure)}
          onClusterDiscover={handleClusterDiscover}
          onMapBackgroundClick={handleMapBackgroundClick}
          onBlossomPinSelect={handleBlossomPinSelect}
          onBlossomCategorySelect={handleBlossomCategorySelect}
          onBlossomOverflow={handleBlossomOverflow}
          livingCluster={livingCluster}
          livingWorld={livingWorld}
          socialDiscovery={mergedSocialDiscovery}
          questoryIdentity={questoryIdentitySnapshot}
          worldDiscovery={worldDiscoverySnapshot}
          onTerritorySelect={handleTerritorySelect}
          onMapZoomChange={setMapZoom}
          onMapFlyReady={(api) => {
            earthFlyRef.current = api;
          }}
          isAdmin={isAdmin}
          userId={userId}
          showUserLocation
          userLocation={location}
          mapExploration={livingWorld.exploration}
          mapWorldNow={worldNow}
          mapState={state}
          selectedAdventureId={selectedAdventure?.id}
          findMeSignal={findMeSignal}
          onVisiblePinCountChange={setVisiblePinCount}
          onPinHoverChange={setHoveredPinId}
          onSpatialStatsChange={setSpatialStats}
          progressiveLayers={shellMode ? layerSnapshot.layers : null}
        />

        <ProgressiveLayer layerId={WORLD_LAYER_IDS.EARTH} layers={shellMode ? layerSnapshot.layers : null}>
          <Suspense fallback={null}>
            <LivingEarthOverlay
              snapshot={livingEarthSnapshot}
              onFlyTo={handleEarthFlyTo}
              onReturnToMap={handleReturnToMap}
              setState={setState}
              showDiscoveryPanel={!livingCluster && !selectedAdventure}
            />
          </Suspense>
        </ProgressiveLayer>

        <ProgressiveLayer layerId={WORLD_LAYER_IDS.MARKETPLACE} layers={shellMode ? layerSnapshot.layers : null}>
          {nav && !earthOverlayVisible && (
            <MarketplaceMapHud snapshot={marketplaceSnapshot} nav={nav} />
          )}
        </ProgressiveLayer>

        {showPinDebugLine && (
          <p className="map-pin-debug-line">
            {pinStats.pinCount} map pins · {pinStats.loaded} adventures loaded ·{' '}
            {pinStats.missingCoords} missing coordinates · {pinStats.accessFiltered} filtered by
            access
          </p>
        )}

        {showMapFallbackList && (
          <MapPinFallbackList
            adventureMarkers={adventureMarkers}
            onAdventureClick={handleAdventureClick}
          />
        )}

        {livingCluster?.overflowOpen && overflowPickerMarkers.length > 0 && (
          <ClusterAdventurePicker
            meta={{
              ...livingCluster.meta,
              count: overflowPickerMarkers.length,
            }}
            markers={overflowPickerMarkers}
            mapState={state}
            accessOptions={accessOptions}
            clusterDistanceM={clusterDistanceM}
            onClose={handleOverflowPickerClose}
            onSelectAdventure={handleOverflowAdventureSelect}
          />
        )}

        {selectedAdventure && selectedAccess && (
          <MapPinCard
            adventure={selectedAdventure}
            access={selectedAccess}
            visual={pinVisual}
            distanceM={selectedMarker?.distanceM}
            entering={cardEntering}
            onClose={handleCardClose}
            onPlay={handleMapCardPlay}
            onPreview={handleMapCardPreview}
            onViewClues={handleViewClues}
          />
        )}
      </div>

      {focusedAdventure && (
        <button
          type="button"
          className="ghost map-clear-btn"
          onClick={() => {
            setFocusedAdventure(null);
            setSelectedMarker(null);
          }}
        >
          ← Back to all adventures
        </button>
      )}

      {!adventureMarkers.length && (
        <div className="card empty-vault">
          <MapPin size={28} />
          <p>No adventures match this filter with map locations.</p>
        </div>
      )}

      {!shellMode && worldDiscoverySnapshot.currentRegion && (
        <p className="admin-meta map-fog-hint">
          🌍 {worldDiscoverySnapshot.currentRegion.label}{' '}
          {Math.round(worldDiscoverySnapshot.currentRegion.completionPercent)}% discovered · Earth{' '}
          {worldDiscoverySnapshot.worldRegion.animatedDisplayPercent?.toFixed(2)}% ·{' '}
          {livingWorld.revealedCount} fog tile{livingWorld.revealedCount === 1 ? '' : 's'} revealed
          by you
        </p>
      )}
    </>
  );
}

export function MiniClueMap({ adventure, activeClueIndex }) {
  const clueMarkers = buildClueMarkers(adventure, activeClueIndex);

  return (
    <div className="mini-map-wrap">
      <div className="mini-map-label">
        <MapPin size={14} /> Clue {activeClueIndex + 1} · {adventure.location}
      </div>
      <QuestoryMap mini clueMarkers={clueMarkers} className="play-mini-map" />
    </div>
  );
}
