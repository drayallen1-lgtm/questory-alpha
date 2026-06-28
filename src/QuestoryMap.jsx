import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  BLOSSOM_ANIM_MS,
  BLOSSOM_MAX_PINS,
  buildBlossomTooltipHtml,
  computeBlossomLayout,
  computeCategoryBlossomLayout,
  createBlossomAdventureElement,
  createBlossomCategoryElement,
  createBlossomOverflowElement,
  groupMarkersByCategory,
  livingClusterPhase,
  wireBlossomAdventureElement,
} from './mapClusterBlossom';
import { createMapCameraController } from './mapCamera';
import { ClusterAdventurePicker, MapFilterBar, MapPinCard } from './MapPinCard';

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

function setupAdventureLayerInteractions(map, { getMarkerById, getMapState }) {
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
  isAdmin = false,
  userId = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersOnScreenRef = useRef({});
  const userMarkerRef = useRef(null);
  const mapReadyRef = useRef(false);
  const adventureMarkersRef = useRef(adventureMarkers);
  const markerLookupRef = useRef(new Map());
  const mapStateRef = useRef(mapState);
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
  const requestCameraMoveRef = useRef(null);
  const [mapInitFailed, setMapInitFailed] = useState(false);
  adventureMarkersRef.current = adventureMarkers;
  mapStateRef.current = mapState;
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

    const handleClusterTap = (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleClusterClickRef.current?.(clusterId, coords);
    };

    if (!entry) {
      const el = createClusterElement(mergedMeta);
      el.addEventListener('click', handleClusterTap);
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
      }
    }

    const el = entry.getElement();
    if (el) {
      el.classList.toggle('questory-cluster-fading', Boolean(options.fading));
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

  const handleClusterClick = useCallback((clusterId, coords) => {
    const map = mapRef.current;
    const source = map?.getSource(ADVENTURE_SOURCE);
    if (!map || !source) return;

    source.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
      if (err || !leaves?.length) return;
      const leafMarkers = leaves
        .map((f) => markerLookupRef.current.get(f.properties?.id ?? f.id))
        .filter(Boolean);
      if (!leafMarkers.length) return;

      const meta = summarizeClusterMarkers(leafMarkers, mapStateRef.current);
      meta.count = leafMarkers.length;
      const categories = groupMarkersByCategory(leafMarkers, mapStateRef.current);

      if (isDev) {
        console.debug('[QuestoryMap]', {
          clusterClicked: { count: meta.count, clusterId, categories: categories.length },
        });
      }

      onClusterDiscoverRef.current?.({
        clusterId,
        coords,
        markers: leafMarkers,
        meta,
        categories,
      });
    });
  }, []);

  handleClusterClickRef.current = handleClusterClick;

  const syncBlossomMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const living = livingClusterRef.current;
    const nextIds = new Set();
    const accessOptions = {
      userLatitude: userLocationRef.current?.latitude,
      userLongitude: userLocationRef.current?.longitude,
      isAdmin: isAdminRef.current,
      userId: userIdRef.current,
    };

    const placeBlossomMarker = (id, coords, element, offset) => {
      nextIds.add(id);
      let entry = markersOnScreenRef.current[id];
      if (!entry) {
        entry = new mapboxgl.Marker({ element, anchor: 'center', offset })
          .setLngLat(coords)
          .addTo(map);
        markersOnScreenRef.current[id] = entry;
        requestAnimationFrame(() => {
          element.classList.add('blossom-animate-in');
          window.setTimeout(() => element.classList.add('blossom-open-pulse'), BLOSSOM_ANIM_MS);
        });
      } else {
        entry.setLngLat(coords);
        entry.setOffset(offset);
      }
    };

    if (living && !living.overflowOpen && living.coords) {
      const coords = living.coords;
      const selectedId = living.selectedId;

      if (living.phase === 'category' && living.categories?.length) {
        const layout = computeCategoryBlossomLayout(living.categories);
        living.categories.forEach((category, index) => {
          const slot = layout.slots[index];
          if (!slot) return;
          const id = `blossom-${living.clusterId}-cat-${category.id}`;
          let entry = markersOnScreenRef.current[id];
          let el = entry?.getElement?.();
          if (!el) {
            el = createBlossomCategoryElement(category, index);
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              onBlossomCategorySelectRef.current?.(category.id);
            });
          }
          placeBlossomMarker(id, coords, el, [slot.x, slot.y]);
        });
      } else {
        const markers = living.activeMarkers || [];
        const layout = computeBlossomLayout(markers.length);
        const selectedMarker = selectedId ? markers.find((m) => m.id === selectedId) : null;
        const selectedInRing = Boolean(
          selectedMarker &&
            layout.slots.some(
              (slot) => slot.kind === 'item' && markers[slot.index]?.id === selectedId
            )
        );
        const selectedFromOverflow = Boolean(selectedMarker && !selectedInRing);

        layout.slots.forEach((slot) => {
          if (slot.kind === 'overflow') {
            if (selectedFromOverflow) return;
            const id = `blossom-${living.clusterId}-overflow`;
            let entry = markersOnScreenRef.current[id];
            let el = entry?.getElement?.();
            if (!el) {
              el = createBlossomOverflowElement(layout.overflowCount);
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                onBlossomOverflowRef.current?.();
              });
            } else {
              const label = el.querySelector('.blossom-overflow-label');
              if (label) label.textContent = `+${layout.overflowCount} More`;
              el.classList.toggle('blossom-dimmed', Boolean(selectedId));
            }
            placeBlossomMarker(id, coords, el, [slot.x, slot.y]);
            return;
          }

          const marker = markers[slot.index];
          if (!marker) return;
          const id = `blossom-${living.clusterId}-${marker.id}`;
          const visual = resolvePinVisual(marker.adventure, mapStateRef.current);
          const dimmed = Boolean(selectedId && selectedId !== marker.id);
          const selected = selectedId === marker.id;
          let entry = markersOnScreenRef.current[id];
          let el = entry?.getElement?.();

          if (!el) {
            el = createBlossomAdventureElement(marker, visual, {
              dimmed,
              selected,
              animIndex: slot.index,
            });
            wireBlossomAdventureElement(el, {
              marker,
              mapState: mapStateRef.current,
              accessOptions,
              onSelect: (data) => onBlossomPinSelectRef.current?.(data),
              onHoverChange: (hoverId) => onPinHoverChangeRef.current?.(hoverId),
              getTooltipHtml: buildBlossomTooltipHtml,
            });
          } else {
            el.classList.toggle('blossom-dimmed', dimmed);
            el.classList.toggle('blossom-selected', selected);
            el.classList.toggle('pin-solo-active', selected);
            el.classList.toggle('blossom-selected-pulse', selected);
          }

          placeBlossomMarker(id, coords, el, [slot.x, slot.y]);
        });

        if (selectedFromOverflow && selectedMarker) {
          const id = `blossom-${living.clusterId}-selected`;
          const visual = resolvePinVisual(selectedMarker.adventure, mapStateRef.current);
          let entry = markersOnScreenRef.current[id];
          let el = entry?.getElement?.();

          if (!el) {
            el = createBlossomAdventureElement(selectedMarker, visual, {
              dimmed: false,
              selected: true,
              animIndex: 0,
            });
            wireBlossomAdventureElement(el, {
              marker: selectedMarker,
              mapState: mapStateRef.current,
              accessOptions,
              onSelect: (data) => onBlossomPinSelectRef.current?.(data),
              onHoverChange: (hoverId) => onPinHoverChangeRef.current?.(hoverId),
              getTooltipHtml: buildBlossomTooltipHtml,
            });
          }

          placeBlossomMarker(id, coords, el, [0, 0]);
        }
      }
    }

    Object.keys(markersOnScreenRef.current).forEach((id) => {
      if (!id.startsWith('blossom-')) return;
      if (!nextIds.has(id)) {
        markersOnScreenRef.current[id].remove();
        delete markersOnScreenRef.current[id];
      }
    });
  }, []);

  const syncHtmlMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(ADVENTURE_SOURCE)) return;

    const markers = adventureMarkersRef.current;
    const nextIds = new Set();
    let clusterCount = 0;
    const living = livingClusterRef.current;
    const suppressedId = living?.clusterId ?? null;
    const blossomOpen = Boolean(living && !living.overflowOpen);

    const reportStats = (pinCount) => {
      onVisiblePinCountChange?.(pinCount);
      onSpatialStatsChangeRef.current?.({
        adventureCount: markers.length,
        markerCount: markers.length,
        pinCount,
        clusterCount,
      });
    };

    let features = [];
    try {
      features = map.querySourceFeatures(ADVENTURE_SOURCE);
    } catch {
      features = [];
    }

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
      if (suppressedId != null && props.cluster_id === suppressedId) {
        upsertClusterMarker(
          map,
          props.cluster_id,
          coords,
          count,
          { dominant: { icon: '📍', label: 'Adventure' } },
          nextIds,
          { fading: blossomOpen }
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
            fading: blossomOpen,
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

    if (!blossomOpen && !living?.overflowOpen) {
      const useDirectMarkers = features.length === 0 && markers.length > 0;

      if (useDirectMarkers) {
        for (const markerData of markers) {
          upsertAdventurePin(
            map,
            markerData.id,
            [markerData.longitude, markerData.latitude],
            nextIds
          );
        }
      } else {
        for (const feature of features) {
          const props = parseFeatureProps(feature.properties);
          const coords = feature.geometry?.coordinates;
          if (!coords || isClusterFeature(props)) continue;
          const id = props.id ?? feature.id;
          if (!id) continue;
          upsertAdventurePin(map, id, coords, nextIds);
        }

        if (!nextIds.size && markers.length > 0 && clusterCount === 0) {
          for (const markerData of markers) {
            upsertAdventurePin(
              map,
              markerData.id,
              [markerData.longitude, markerData.latitude],
              nextIds
            );
          }
        }
      }
    }

    syncBlossomMarkers();

    Object.keys(markersOnScreenRef.current).forEach((id) => {
      if (!nextIds.has(id)) {
        markersOnScreenRef.current[id].remove();
        delete markersOnScreenRef.current[id];
      }
    });

    let pinCount = [...nextIds].filter((id) => !String(id).startsWith('cluster-')).length;
    if (!pinCount && clusterCount > 0) pinCount = markers.length;
    reportStats(pinCount);
  }, [upsertAdventurePin, upsertClusterMarker, onVisiblePinCountChange, syncBlossomMarkers]);

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
        data: revealedAreasGeoJSON(mapExploration),
      });
      map.addLayer({
        id: 'revealed-fill',
        type: 'fill',
        source: MAP_SOURCE_IDS.REVEALED,
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.08,
        },
      });
      map.addLayer({
        id: 'revealed-outline',
        type: 'line',
        source: MAP_SOURCE_IDS.REVEALED,
        paint: {
          'line-color': '#5eead4',
          'line-opacity': 0.35,
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
      });

      map.on('click', () => {
        if (isDev) {
          console.debug('[QuestoryMap]', { mapBackgroundClicked: true });
        }
        onMapBackgroundClickRef.current?.();
      });

      map.on('moveend', syncHtmlMarkers);
      map.on('zoomend', syncHtmlMarkers);
      map.on('sourcedata', (e) => {
        if (e.sourceId === ADVENTURE_SOURCE && e.isSourceLoaded) syncHtmlMarkers();
      });

      syncHtmlMarkers();
    });

    return () => {
      cancelled = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (src) src.setData(revealedAreasGeoJSON(mapExploration));
  }, [mapExploration, mini]);

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
    </div>
  );
}

export function MapScreen({ adventures, nav, state, setState, isAdmin = false, userId = null }) {
  const [activeFilter, setActiveFilter] = useState(MAP_FILTERS.ALL);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [livingCluster, setLivingCluster] = useState(null);
  const [focusedAdventure, setFocusedAdventure] = useState(null);
  const [findMeSignal, setFindMeSignal] = useState(0);
  const [visiblePinCount, setVisiblePinCount] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [spatialStats, setSpatialStats] = useState(null);
  const { location } = usePlayerLocation();
  const presence = state?.social?.mapPresence || {
    explorersNearby: 12,
    activeHunts: 4,
    teamsCompeting: 3,
  };
  const visibility = state?.social?.visibility || VISIBILITY_MODES.TEAM;
  const follows = state?.economy?.follows || [];

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

  const adventureMarkers = buildAdventureMarkers(filteredAdventures, accessOptions);
  const clueMarkers = focusedAdventure ? buildClueMarkers(focusedAdventure) : [];

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
  const previewAccess = selectedAdventure
    ? evaluateAccessContext(selectedAdventure, { ...accessOptions, adminPreview: false })
    : null;
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

  function handleLivingClusterCollapse() {
    setLivingCluster(null);
    setSelectedMarker(null);
    setHoveredPinId(null);
  }

  function handleClusterDiscover(payload) {
    setSelectedMarker(null);
    const { categories } = payload;
    if (categories.length === 1) {
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
    setLivingCluster((lc) => {
      if (!lc) return lc;
      const cat = lc.categories.find((c) => c.id === categoryId);
      if (!cat) return lc;
      return {
        ...lc,
        phase: 'adventure',
        categoryId,
        activeMarkers: cat.markers,
        selectedId: null,
      };
    });
  }

  function handleBlossomPinSelect(marker) {
    if (!livingCluster) return;
    setLivingCluster((lc) => (lc ? { ...lc, selectedId: marker.id } : lc));
    handleAdventureClick(marker.adventure, {
      ...marker,
      fromCluster: true,
      clusterId: livingCluster.clusterId,
    });
  }

  function handleBlossomOverflow() {
    setLivingCluster((lc) => (lc ? { ...lc, overflowOpen: true } : lc));
  }

  function handleOverflowPickerClose() {
    setLivingCluster((lc) => (lc ? { ...lc, overflowOpen: false } : lc));
  }

  function handleOverflowAdventureSelect(marker) {
    if (!livingCluster) return;
    setLivingCluster((lc) =>
      lc
        ? {
            ...lc,
            overflowOpen: false,
            selectedId: marker.id,
          }
        : lc
    );
    handleAdventureClick(marker.adventure, {
      ...marker,
      fromCluster: true,
      clusterId: livingCluster.clusterId,
    });
  }

  function handleMapBackgroundClick() {
    if (isDev) {
      console.debug('[QuestoryMap]', { mapBackgroundClicked: true });
    }
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
        mapCardCtaClicked: true,
        adventureId: adventure.id,
        accessMode: access?.mode,
        targetScreen,
        previewMode,
      });
    }

    nav(targetScreen, adventure.id, { adminPreview: false, previewMode });
  }

  return (
    <>
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
            onClick={() => setFindMeSignal((n) => n + 1)}
          >
            <LocateFixed size={16} /> Find Me
          </button>
        )}
      </div>

      <MapFilterBar activeFilter={activeFilter} onChange={setActiveFilter} counts={filterCounts} />

      {state && setState && (
        <LiveMapOverlay
          presence={presence}
          visibility={visibility}
          onVisibilityChange={(mode) =>
            setState((s) => ({
              ...s,
              social: { ...s.social, visibility: mode },
            }))
          }
        />
      )}

      <div
        className={`map-stage${livingCluster ? ' map-stage-living-cluster' : ''}${selectedMarker?.fromCluster ? ' map-stage-adventure-active' : ''}`}
      >
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
          isAdmin={isAdmin}
          userId={userId}
          showUserLocation
          userLocation={location}
          mapExploration={state?.mapExploration}
          mapState={state}
          selectedAdventureId={selectedAdventure?.id}
          findMeSignal={findMeSignal}
          onVisiblePinCountChange={setVisiblePinCount}
          onPinHoverChange={setHoveredPinId}
          onSpatialStatsChange={setSpatialStats}
        />

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

        {selectedAdventure && previewAccess && (
          <MapPinCard
            adventure={selectedAdventure}
            access={previewAccess}
            visual={pinVisual}
            distanceM={selectedMarker?.distanceM}
            onClose={handleCardClose}
            onPlay={handleMapCardPlay}
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

      {state?.mapExploration?.revealed?.length > 0 && (
        <p className="admin-meta map-fog-hint">
          🗺️ {state.mapExploration.revealed.length} area
          {state.mapExploration.revealed.length === 1 ? '' : 's'} explored on your map
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
