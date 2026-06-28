import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LocateFixed, MapPin } from 'lucide-react';
import { LiveMapOverlay } from './SocialUI';
import { VISIBILITY_MODES } from './social';
import {
  MAPBOX_FALLBACK_MESSAGE,
  getMapboxToken,
  buildAdventureMarkers,
  buildClueMarkers,
  computeMapPinStats,
  getMapBounds,
  hasMapboxToken,
} from './mapUtils';
import { AccessStatusBanner, usePlayerLocation } from './AccessRulesUI';
import { evaluateAccessContext } from './accessRules';
import { isDev } from './config/env';
import {
  MAP_FILTERS,
  MAP_LAYER_IDS,
  MAP_SOURCE_IDS,
  MAP_SPATIAL_SOURCE_IDS,
  NEAR_ME_PULSE_RADIUS_M,
  adventureMatchesFilter,
  circlePolygon,
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
  SPIDERFY_MIN_ZOOM,
  anchorPointsGeoJSON,
  buildClusterTooltipHtml,
  centerOnPinWithCardPadding,
  clusterVisualClasses,
  computeSpiderfyLayoutPixel,
  easeMapTo,
  flyMapTo,
  getOffscreenSpiderGroup,
  groupOverlappingMarkers,
  shouldSpiderfyAtZoom,
  spiderLinesGeoJSON,
  summarizeClusterMarkers,
} from './mapSpatial';
import { createMapCameraController } from './mapCamera';
import { MapFilterBar, MapPinCard } from './MapPinCard';

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

function setupAdventureLayerInteractions(map, { getMarkerById, onAdventureSelect, getMapState, requestCameraMove }) {
  const clusterPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'questory-cluster-tooltip-popup',
    offset: 14,
    maxWidth: '260px',
  });

  const handleClusterClick = (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [MAP_LAYER_IDS.CLUSTERS] });
    if (!features.length) return;
    const feature = features[0];
    const clusterId = feature.properties?.cluster_id;
    if (clusterId == null) return;
    const coords = feature.geometry.coordinates;
    const source = map.getSource(ADVENTURE_SOURCE);

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      const currentZoom = map.getZoom();
      const targetZoom = Math.min(zoom, SPIDERFY_MIN_ZOOM + 1);

      if (targetZoom <= currentZoom + 0.25) {
        source.getClusterLeaves(clusterId, 100, 0, (leafErr, leaves) => {
          if (leafErr || !leaves?.length) return;
          requestCameraMove?.('cluster', (m) => {
            easeMapTo(m, {
              center: coords,
              zoom: Math.max(currentZoom, SPIDERFY_MIN_ZOOM),
              duration: 600,
            });
          });
        });
        return;
      }

      requestCameraMove?.('cluster', (m) => {
        easeMapTo(m, { center: coords, zoom: targetZoom, duration: 600 });
      });
    });
  };

  map.on('click', MAP_LAYER_IDS.CLUSTERS, handleClusterClick);

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

  map.on('click', MAP_LAYER_IDS.UNCLUSTERED, (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const props = feature.properties || {};
    const id = props.id ?? feature.id;
    if (!id) return;
    const markerData = getMarkerById?.(id);
    if (markerData?.adventure) {
      e.originalEvent?.stopPropagation?.();
      onAdventureSelect?.(markerData);
    }
  });

  map.on('mouseenter', MAP_LAYER_IDS.UNCLUSTERED, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', MAP_LAYER_IDS.UNCLUSTERED, () => {
    map.getCanvas().style.cursor = '';
  });
}

function addSpiderLayers(map) {
  if (map.getSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_LINES)) return;

  map.addSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_LINES, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_ANCHORS, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'spider-lines',
    type: 'line',
    source: MAP_SPATIAL_SOURCE_IDS.SPIDER_LINES,
    paint: {
      'line-color': '#5eead4',
      'line-opacity': 0.35,
      'line-width': 1.5,
      'line-dasharray': [2, 3],
    },
  });

  map.addLayer({
    id: 'spider-anchors',
    type: 'circle',
    source: MAP_SPATIAL_SOURCE_IDS.SPIDER_ANCHORS,
    paint: {
      'circle-radius': 5,
      'circle-color': '#14b8a6',
      'circle-opacity': 0.55,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#5eead4',
      'circle-stroke-opacity': 0.75,
    },
  });
}

function updateSpiderLayers(map, spiderGroups, layouts) {
  const lineSrc = map.getSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_LINES);
  const anchorSrc = map.getSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_ANCHORS);
  if (!lineSrc || !anchorSrc) return;
  lineSrc.setData(spiderLinesGeoJSON(spiderGroups, layouts));
  anchorSrc.setData(anchorPointsGeoJSON(spiderGroups));
}

function clearSpiderLayers(map) {
  const lineSrc = map.getSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_LINES);
  const anchorSrc = map.getSource(MAP_SPATIAL_SOURCE_IDS.SPIDER_ANCHORS);
  if (lineSrc) lineSrc.setData({ type: 'FeatureCollection', features: [] });
  if (anchorSrc) anchorSrc.setData({ type: 'FeatureCollection', features: [] });
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
}) {
  const allMarkers = [...adventureMarkers, ...clueMarkers];
  const bounds = getMapBounds(allMarkers);

  return (
    <div className={`fallback-map ${mini ? 'mini' : ''} ${className}`}>
      <div className="fallback-map-grid" />
      <div className="fallback-map-body">
        {!mini && <p className="fallback-map-notice">{MAPBOX_FALLBACK_MESSAGE}</p>}
        {mini && <p className="fallback-map-notice mini-notice">{MAPBOX_FALLBACK_MESSAGE}</p>}
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
  const cameraRef = useRef(null);
  const onAdventureClickRef = useRef(onAdventureClick);
  const onPinHoverChangeRef = useRef(onPinHoverChange);
  const onSpatialStatsChangeRef = useRef(onSpatialStatsChange);
  const requestCameraMoveRef = useRef(null);
  adventureMarkersRef.current = adventureMarkers;
  mapStateRef.current = mapState;
  userLocationRef.current = userLocation;
  selectedAdventureIdRef.current = selectedAdventureId;
  onAdventureClickRef.current = onAdventureClick;
  onPinHoverChangeRef.current = onPinHoverChange;
  onSpatialStatsChangeRef.current = onSpatialStatsChange;
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

  const upsertClusterMarker = useCallback((map, clusterId, coords, count, meta, nextIds) => {
    const id = `cluster-${clusterId}`;
    nextIds.add(id);
    let entry = markersOnScreenRef.current[id];
    const mergedMeta = { ...meta, count };
    const requestCameraMove = requestCameraMoveRef.current;

    const handleClusterTap = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const source = map.getSource(ADVENTURE_SOURCE);
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        const currentZoom = map.getZoom();
        const targetZoom = Math.min(zoom, SPIDERFY_MIN_ZOOM + 1);
        if (targetZoom <= currentZoom + 0.25) {
          source.getClusterLeaves(clusterId, 100, 0, (leafErr) => {
            if (leafErr) return;
            requestCameraMove?.('cluster', (m) => {
              easeMapTo(m, {
                center: coords,
                zoom: Math.max(currentZoom, SPIDERFY_MIN_ZOOM),
                duration: 600,
              });
            });
          });
          return;
        }
        requestCameraMove?.('cluster', (m) => {
          easeMapTo(m, { center: coords, zoom: targetZoom, duration: 600 });
        });
      });
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
  }, []);

  const upsertAdventurePin = useCallback(
    (map, id, coords, nextIds) => {
      nextIds.add(id);
      const markerData = markerLookup.get(id);
      if (!markerData) return;
      const visual = resolvePinVisual(markerData.adventure, mapStateRef.current);
      const selected = selectedAdventureIdRef.current === id;
      let entry = markersOnScreenRef.current[id];

      if (!entry) {
        const el = createAdventurePinElement(visual, {
          selected,
          pinAccess: markerData.pinAccess,
        });
        wireAdventurePinElement(el, {
          markerData,
          visual,
          selected,
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
          wireAdventurePinElement(el, {
            markerData,
            visual,
            selected,
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

  const syncHtmlMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(ADVENTURE_SOURCE)) return;

    const markers = adventureMarkersRef.current;
    const zoom = map.getZoom();
    const nextIds = new Set();
    let clusterCount = 0;
    let spiderGroupCount = 0;

    const reportStats = (pinCount) => {
      onVisiblePinCountChange?.(pinCount);
      onSpatialStatsChangeRef.current?.({
        adventureCount: markers.length,
        markerCount: markers.length,
        pinCount,
        clusterCount,
        spiderfyGroupCount: spiderGroupCount,
      });
    };

    if (shouldSpiderfyAtZoom(zoom)) {
      const groups = groupOverlappingMarkers(markers);
      const offscreenGroup = getOffscreenSpiderGroup(groups, map);
      const cam = cameraRef.current?.state;

      if (
        offscreenGroup &&
        cam &&
        !cam.isUserInteracting &&
        cam.lastSpiderAnchorKey !== offscreenGroup.id
      ) {
        cam.lastSpiderAnchorKey = offscreenGroup.id;
        const moved = requestCameraMoveRef.current?.('spiderAnchor', (m) => {
          easeMapTo(m, {
            center: [offscreenGroup.anchor.longitude, offscreenGroup.anchor.latitude],
            zoom: Math.max(zoom, SPIDERFY_MIN_ZOOM),
            duration: 450,
          });
        });
        if (moved) {
          reportStats(0);
          return;
        }
      }

      const layouts = new Map();
      const spiderGroups = [];
      const spiderDebug = [];
      let deferSpiderfy = false;

      for (const group of groups) {
        if (group.markers.length >= 2) {
          const result = computeSpiderfyLayoutPixel(group, map, { debug: isDev });
          if (result.needsAnchorPan) {
            const camState = cameraRef.current?.state;
            if (
              camState &&
              !camState.isUserInteracting &&
              camState.lastSpiderAnchorKey !== group.id
            ) {
              camState.lastSpiderAnchorKey = group.id;
              const moved = requestCameraMoveRef.current?.('spiderAnchor', (m) => {
                easeMapTo(m, {
                  center: [group.anchor.longitude, group.anchor.latitude],
                  zoom: Math.max(zoom, SPIDERFY_MIN_ZOOM),
                  duration: 450,
                });
              });
              if (moved) {
                reportStats(0);
                return;
              }
            }
            deferSpiderfy = true;
            continue;
          }
          if (result.invalidEdgeClamp || !result.layout.size) {
            deferSpiderfy = true;
            continue;
          }
          spiderGroups.push(group);
          layouts.set(group.id, result.layout);
          if (isDev && result.debug.length) spiderDebug.push(...result.debug);
        }
      }
      spiderGroupCount = spiderGroups.length;

      if (isDev && spiderDebug.length) {
        console.debug('[MapSpiderfy]', spiderDebug);
      }

      if (deferSpiderfy && !spiderGroups.length) {
        reportStats(0);
        return;
      }

      if (spiderGroups.length) {
        updateSpiderLayers(map, spiderGroups, layouts);
      } else {
        clearSpiderLayers(map);
      }

      for (const group of groups) {
        const layout = layouts.get(group.id);
        if (layout) {
          for (const marker of group.markers) {
            const coords = layout.get(marker.id);
            if (coords) upsertAdventurePin(map, marker.id, coords, nextIds);
          }
        } else if (group.markers.length === 1) {
          const m = group.markers[0];
          upsertAdventurePin(map, m.id, [m.longitude, m.latitude], nextIds);
        }
      }
    } else {
      if (cameraRef.current?.state) {
        cameraRef.current.state.lastSpiderAnchorKey = null;
      }
      clearSpiderLayers(map);
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

    Object.keys(markersOnScreenRef.current).forEach((id) => {
      if (!nextIds.has(id)) {
        markersOnScreenRef.current[id].remove();
        delete markersOnScreenRef.current[id];
      }
    });

    let pinCount = [...nextIds].filter((id) => !String(id).startsWith('cluster-')).length;
    if (!pinCount && clusterCount > 0) pinCount = markers.length;
    reportStats(pinCount);
  }, [upsertAdventurePin, upsertClusterMarker, onVisiblePinCountChange]);

  syncHtmlMarkersRef.current = syncHtmlMarkers;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current || mini) return;

    mapboxgl.accessToken = token;
    const initialCenter =
      userLocation?.longitude != null
        ? [userLocation.longitude, userLocation.latitude]
        : [-95.261, 37.3392];

    if (userLocation?.latitude != null) {
      cameraRef.current.state.initialUserCentered = true;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: userLocation ? 13 : 11,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    const detachCameraHandlers = cameraRef.current.attachInteractionHandlers(map);

    map.on('load', () => {
      mapReadyRef.current = true;

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

      if (showUserLocation && userLocation?.latitude != null) {
        map.addSource(MAP_SOURCE_IDS.ACCURACY, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: circlePolygon(
              userLocation.latitude,
              userLocation.longitude,
              Math.max(userLocation.accuracy || 25, 15)
            ),
          },
        });
        map.addLayer({
          id: 'accuracy-fill',
          type: 'fill',
          source: MAP_SOURCE_IDS.ACCURACY,
          paint: { 'fill-color': '#60a5fa', 'fill-opacity': 0.12 },
        });

        map.addSource(MAP_SOURCE_IDS.NEAR_ME, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: circlePolygon(
              userLocation.latitude,
              userLocation.longitude,
              NEAR_ME_PULSE_RADIUS_M
            ),
          },
        });
        map.addLayer({
          id: 'near-me-fill',
          type: 'fill',
          source: MAP_SOURCE_IDS.NEAR_ME,
          paint: { 'fill-color': '#5eead4', 'fill-opacity': 0.06 },
        });
        map.addLayer({
          id: 'near-me-line',
          type: 'line',
          source: MAP_SOURCE_IDS.NEAR_ME,
          paint: {
            'line-color': '#5eead4',
            'line-opacity': 0.35,
            'line-width': 1.5,
            'line-dasharray': [2, 2],
          },
        });
      }

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
      addSpiderLayers(map);
      setupAdventureLayerInteractions(map, {
        getMarkerById: (id) => markerLookupRef.current.get(id),
        getMapState: () => mapStateRef.current,
        onAdventureSelect: (markerData) => {
          if (markerData?.adventure) onAdventureClickRef.current?.(markerData.adventure, markerData);
        },
        requestCameraMove: (...args) => cameraRef.current?.requestCameraMove(...args),
      });

      map.on('moveend', syncHtmlMarkers);
      map.on('zoomend', syncHtmlMarkers);
      map.on('sourcedata', (e) => {
        if (e.sourceId === ADVENTURE_SOURCE && e.isSourceLoaded) syncHtmlMarkers();
      });

      syncHtmlMarkers();
    });

    return () => {
      detachCameraHandlers?.();
      mapReadyRef.current = false;
      Object.values(markersOnScreenRef.current).forEach((m) => m.remove());
      markersOnScreenRef.current = {};
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mini]);

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

    const accuracySrc = map.getSource(MAP_SOURCE_IDS.ACCURACY);
    if (accuracySrc) {
      accuracySrc.setData({
        type: 'Feature',
        geometry: circlePolygon(
          userLocation.latitude,
          userLocation.longitude,
          Math.max(userLocation.accuracy || 25, 15)
        ),
      });
    }
    const nearSrc = map.getSource(MAP_SOURCE_IDS.NEAR_ME);
    if (nearSrc) {
      nearSrc.setData({
        type: 'Feature',
        geometry: circlePolygon(
          userLocation.latitude,
          userLocation.longitude,
          NEAR_ME_PULSE_RADIUS_M
        ),
      });
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
    requestCameraMoveRef.current?.(
      'findMe',
      (m) => {
        flyMapTo(m, {
          center: [loc.longitude, loc.latitude],
          zoom: 14,
          duration: 900,
        });
      },
      { allowDuringInteraction: true }
    );
  }, [findMeSignal, mini]);

  useEffect(() => {
    const map = mapRef.current;
    const cam = cameraRef.current;
    if (!map || mini || !cam) return;

    if (!selectedAdventureId) {
      cam.state.lastCenteredPinId = null;
      return;
    }

    if (cam.state.lastCenteredPinId === selectedAdventureId) return;

    const marker = markerLookupRef.current.get(selectedAdventureId);
    if (!marker) return;

    cam.state.lastCenteredPinId = selectedAdventureId;
    requestCameraMoveRef.current?.(
      'pinSelect',
      (m) => {
        centerOnPinWithCardPadding(m, [marker.longitude, marker.latitude], {
          zoom: Math.max(m.getZoom(), SPIDERFY_MIN_ZOOM),
        });
      },
      { pinId: selectedAdventureId }
    );
  }, [selectedAdventureId, mini]);

  useEffect(() => {
    if (mini || !mapRef.current) return;
    syncHtmlMarkers();
  }, [selectedAdventureId, syncHtmlMarkers, mini]);

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

  if (!token) {
    return (
      <FallbackMap
        adventureMarkers={adventureMarkers}
        clueMarkers={clueMarkers}
        onAdventureClick={onAdventureClick}
        onClueClick={onClueClick}
        mini={mini}
        className={className}
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
      spiderfyGroupCount: spatialStats?.spiderfyGroupCount ?? 0,
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
  ]);

  const selectedAdventure = selectedMarker?.adventure || null;
  const previewAccess = selectedAdventure
    ? evaluateAccessContext(selectedAdventure, { ...accessOptions, adminPreview: false })
    : null;
  const pinVisual = selectedAdventure ? resolvePinVisual(selectedAdventure, state) : null;

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
              ? 'Tap a pin to explore · icons only until selected'
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

      <div className="map-stage">
        <QuestoryMap
          adventureMarkers={focusedAdventure ? [] : adventureMarkers}
          clueMarkers={clueMarkers}
          onAdventureClick={handleAdventureClick}
          onClueClick={(marker) => handleViewClues(marker.adventure)}
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

        {selectedAdventure && previewAccess && (
          <MapPinCard
            adventure={selectedAdventure}
            access={previewAccess}
            visual={pinVisual}
            distanceM={selectedMarker?.distanceM}
            onClose={() => setSelectedMarker(null)}
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
