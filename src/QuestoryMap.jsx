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
  NEAR_ME_PULSE_RADIUS_M,
  adventureMatchesFilter,
  circlePolygon,
  createAdventurePinElement,
  filterMapAdventures,
  markersToGeoJSON,
  resolvePinVisual,
  revealedAreasGeoJSON,
  recordMapReveal,
  wireAdventurePinElement,
} from './mapDiscovery';
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

function setupAdventureLayerInteractions(map, { getMarkerById, onAdventureSelect, onClusterHover }) {
  const clusterPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'questory-cluster-tooltip-popup',
    offset: 14,
    maxWidth: '240px',
  });

  map.on('click', MAP_LAYER_IDS.CLUSTERS, (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [MAP_LAYER_IDS.CLUSTERS] });
    if (!features.length) return;
    const clusterId = features[0].properties?.cluster_id;
    if (clusterId == null) return;
    map.getSource(ADVENTURE_SOURCE).getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: Math.min(zoom, 16),
        duration: 500,
      });
    });
  });

  map.on('mouseenter', MAP_LAYER_IDS.CLUSTERS, (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const count = Number(e.features?.[0]?.properties?.point_count) || 0;
    if (count > 0) {
      onClusterHover?.(count);
      clusterPopup
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(`<div class="questory-cluster-tooltip">${count} adventures</div>`)
        .addTo(map);
    }
  });

  map.on('mouseleave', MAP_LAYER_IDS.CLUSTERS, () => {
    map.getCanvas().style.cursor = '';
    onClusterHover?.(null);
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

function addAdventureClusterLayers(map) {
  if (map.getLayer(MAP_LAYER_IDS.CLUSTERS)) return;

  map.addLayer({
    id: MAP_LAYER_IDS.CLUSTERS,
    type: 'circle',
    source: ADVENTURE_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#14b8a6',
      'circle-radius': ['step', ['get', 'point_count'], 22, 5, 28, 15, 34],
      'circle-opacity': 0.88,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0f766e',
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
      'text-size': 13,
    },
    paint: { 'text-color': '#ffffff' },
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
  onFindMe,
  findMeSignal = 0,
  onVisiblePinCountChange,
  onPinHoverChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersOnScreenRef = useRef({});
  const userMarkerRef = useRef(null);
  const mapReadyRef = useRef(false);
  const adventureMarkersRef = useRef(adventureMarkers);
  const markerLookupRef = useRef(new Map());
  const onAdventureClickRef = useRef(onAdventureClick);
  const onPinHoverChangeRef = useRef(onPinHoverChange);
  adventureMarkersRef.current = adventureMarkers;
  onAdventureClickRef.current = onAdventureClick;
  onPinHoverChangeRef.current = onPinHoverChange;
  const token = getMapboxToken();

  const markerLookup = useMemo(() => {
    const map = new Map();
    adventureMarkers.forEach((m) => map.set(m.id, m));
    return map;
  }, [adventureMarkers]);
  markerLookupRef.current = markerLookup;

  const geoJson = useMemo(
    () => markersToGeoJSON(adventureMarkers),
    [adventureMarkers]
  );

  const upsertAdventurePin = useCallback(
    (map, id, coords, nextIds) => {
      nextIds.add(id);
      const markerData = markerLookup.get(id);
      if (!markerData) return;
      const visual = resolvePinVisual(markerData.adventure);
      const selected = selectedAdventureId === id;
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
    [markerLookup, selectedAdventureId]
  );

  const syncHtmlMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(ADVENTURE_SOURCE)) return;

    const markers = adventureMarkersRef.current;
    const nextIds = new Set();
    let features = [];

    try {
      features = map.querySourceFeatures(ADVENTURE_SOURCE);
    } catch {
      features = [];
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
      const hasClusters = features.some((feature) =>
        isClusterFeature(parseFeatureProps(feature.properties))
      );

      for (const feature of features) {
        const props = parseFeatureProps(feature.properties);
        const coords = feature.geometry?.coordinates;
        if (!coords || isClusterFeature(props)) continue;

        const id = props.id ?? feature.id;
        if (!id) continue;
        upsertAdventurePin(map, id, coords, nextIds);
      }

      if (!nextIds.size && markers.length > 0 && !hasClusters) {
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

    Object.keys(markersOnScreenRef.current).forEach((id) => {
      if (!nextIds.has(id)) {
        markersOnScreenRef.current[id].remove();
        delete markersOnScreenRef.current[id];
      }
    });

    let pinCount = nextIds.size;
    const hasVisibleClusters = features.some((feature) =>
      isClusterFeature(parseFeatureProps(feature.properties))
    );
    if (!pinCount && hasVisibleClusters && markers.length > 0) {
      pinCount = markers.length;
    }
    onVisiblePinCountChange?.(pinCount);
  }, [upsertAdventurePin, onVisiblePinCountChange]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current || mini) return;

    mapboxgl.accessToken = token;
    const initialCenter =
      userLocation?.longitude != null
        ? [userLocation.longitude, userLocation.latitude]
        : [-95.261, 37.3392];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: userLocation ? 13 : 11,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

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
        clusterRadius: 52,
      });

      addAdventureClusterLayers(map);
      setupAdventureLayerInteractions(map, {
        getMarkerById: (id) => markerLookupRef.current.get(id),
        onAdventureSelect: (markerData) => {
          if (markerData?.adventure) onAdventureClickRef.current?.(markerData.adventure, markerData);
        },
        onClusterHover: () => {},
      });

      map.on('moveend', syncHtmlMarkers);
      map.on('zoomend', syncHtmlMarkers);
      map.on('sourcedata', (e) => {
        if (e.sourceId === ADVENTURE_SOURCE && e.isSourceLoaded) syncHtmlMarkers();
      });

      syncHtmlMarkers();
    });

    return () => {
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
    if (!map || mini || !findMeSignal) return;
    if (userLocation?.latitude == null) return;
    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 14,
      duration: 900,
      essential: true,
    });
  }, [findMeSignal, userLocation, mini]);

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
    });
  }, [visiblePinCount, adventureMarkers.length, selectedMarker?.id, hoveredPinId]);

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

  function handleViewClues(adventure) {
    setFocusedAdventure(adventure);
    setSelectedMarker(null);
  }

  function openAdventure() {
    if (!selectedAdventure || !previewAccess) return;
    const previewMode = previewAccess.tooFar || previewAccess.mode === 'preview';
    nav('detail', selectedAdventure.id, { adminPreview: false, previewMode });
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
          selectedAdventureId={selectedAdventure?.id}
          findMeSignal={findMeSignal}
          onVisiblePinCountChange={setVisiblePinCount}
          onPinHoverChange={setHoveredPinId}
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
            onPlay={openAdventure}
            onViewClues={() => handleViewClues(selectedAdventure)}
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
