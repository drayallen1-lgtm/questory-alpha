import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, ChevronRight, Eye, Globe } from 'lucide-react';
import { LiveMapOverlay } from './SocialUI';
import { VISIBILITY_MODES } from './social';
import {
  MAPBOX_FALLBACK_MESSAGE,
  getMapboxToken,
  buildAdventureMarkers,
  buildClueMarkers,
  getMapBounds,
  hasMapboxToken,
} from './mapUtils';
import { getSponsorInfo } from './seed';
import { AccessTypeBadge, AccessStatusBanner, usePlayerLocation } from './AccessRulesUI';
import { evaluateAccessContext } from './accessRules';

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
        {!mini && (
          <p className="fallback-map-notice">{MAPBOX_FALLBACK_MESSAGE}</p>
        )}
        {mini && (
          <p className="fallback-map-notice mini-notice">{MAPBOX_FALLBACK_MESSAGE}</p>
        )}
        {bounds && (
          <p className="fallback-map-region">
            {bounds.minLat.toFixed(3)}°N · {Math.abs(bounds.minLng).toFixed(3)}°W
          </p>
        )}
        <div className="fallback-marker-list">
          {adventureMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`fallback-marker adventure pin-${marker.pinAccess || 'playable'}`}
              onClick={() => onAdventureClick?.(marker.adventure)}
            >
              <MapPin size={16} />
              <span>
                <b>{marker.title}</b>
                <small>{marker.subtitle}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
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
                <small>
                  {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                </small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const userMarkerRef = useRef(null);
  const token = getMapboxToken();

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-95.261, 37.3392],
      zoom: mini ? 13 : 12,
      attributionControl: !mini,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, mini]);

  useEffect(() => {
    if (!token || !mapRef.current) return;

    const map = mapRef.current;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const addMarker = (marker, el) => {
      const handleClick = () => {
        if (marker.type === 'adventure') onAdventureClick?.(marker.adventure);
        else onClueClick?.(marker);
      };
      el.addEventListener('click', handleClick);
      const mapMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);
      markerRefs.current.push({
        remove: () => {
          el.removeEventListener('click', handleClick);
          mapMarker.remove();
        },
      });
    };

    adventureMarkers.forEach((marker) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `mapbox-marker adventure-marker pin-${marker.pinAccess || 'playable'}`;
      el.title = marker.title;
      el.innerHTML = `<span class="marker-pin"></span><span class="marker-label">${marker.title}</span>`;
      addMarker(marker, el);
    });

    clueMarkers.forEach((marker) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `mapbox-marker clue-marker ${marker.active ? 'active' : ''}`;
      el.title = marker.title;
      el.innerHTML = `<span class="marker-num">${marker.index}</span>`;
      addMarker(marker, el);
    });

    if (showUserLocation && userLocation?.latitude != null && userLocation?.longitude != null) {
      const el = document.createElement('span');
      el.className = 'mapbox-marker user-location-marker';
      el.title = 'You are here';
      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    }

    const all = [...adventureMarkers, ...clueMarkers];
    if (all.length === 1) {
      map.flyTo({
        center: [all[0].longitude, all[0].latitude],
        zoom: mini ? 14 : 13,
        duration: 600,
      });
    } else if (all.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      all.forEach((m) => bounds.extend([m.longitude, m.latitude]));
      if (userLocation?.latitude != null) {
        bounds.extend([userLocation.longitude, userLocation.latitude]);
      }
      map.fitBounds(bounds, { padding: mini ? 36 : 56, maxZoom: mini ? 14 : 13, duration: 600 });
    }
  }, [
    token,
    adventureMarkers,
    clueMarkers,
    onAdventureClick,
    onClueClick,
    mini,
    showUserLocation,
    userLocation,
  ]);

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
    <div
      ref={containerRef}
      className={`questory-map ${mini ? 'mini' : ''} ${className}`}
    />
  );
}

export function MapScreen({ adventures, nav, state, setState, isAdmin = false, userId = null }) {
  const [focusedAdventure, setFocusedAdventure] = useState(null);
  const [previewAdventure, setPreviewAdventure] = useState(null);
  const { location } = usePlayerLocation();
  const presence = state?.social?.mapPresence || {
    explorersNearby: 12,
    activeHunts: 4,
    teamsCompeting: 3,
  };
  const visibility = state?.social?.visibility || VISIBILITY_MODES.TEAM;

  const accessOptions = {
    userLatitude: location?.latitude,
    userLongitude: location?.longitude,
    isAdmin,
    userId,
  };

  const adventureMarkers = buildAdventureMarkers(adventures, accessOptions);
  const clueMarkers = focusedAdventure ? buildClueMarkers(focusedAdventure) : [];
  const previewAccess = previewAdventure
    ? evaluateAccessContext(previewAdventure, {
        ...accessOptions,
        adminPreview: false,
      })
    : null;

  function handleAdventureClick(adventure) {
    setFocusedAdventure(adventure);
    setPreviewAdventure(adventure);
  }

  function openAdventure() {
    if (!previewAdventure || !previewAccess) return;
    const previewMode = previewAccess.tooFar || previewAccess.mode === 'preview';
    nav('detail', previewAdventure.id, {
      adminPreview: false,
      previewMode,
    });
  }

  return (
    <>
      <div className="section-head">
        <h2>Adventure Map</h2>
        <p>
          {hasMapboxToken()
            ? 'Live Mapbox trails · pins show play access'
            : 'Trail list · add VITE_MAPBOX_TOKEN for live map'}
        </p>
      </div>

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

      <QuestoryMap
        adventureMarkers={focusedAdventure ? [] : adventureMarkers}
        clueMarkers={clueMarkers}
        onAdventureClick={handleAdventureClick}
        onClueClick={(marker) => setPreviewAdventure(marker.adventure)}
        showUserLocation
        userLocation={location}
      />

      {focusedAdventure && (
        <button
          className="ghost map-clear-btn"
          onClick={() => {
            setFocusedAdventure(null);
            setPreviewAdventure(null);
          }}
        >
          ← Back to all adventures
        </button>
      )}

      {previewAdventure && previewAccess && (
        <div className="card map-preview-card">
          <div className="row">
            <AccessTypeBadge adventure={previewAdventure} />
            <span className={`badge map-pin-badge pin-${previewAccess.tooFar ? 'preview' : 'playable'}`}>
              {previewAccess.tooFar ? (
                <>
                  <Eye size={12} /> Preview
                </>
              ) : (
                <>
                  <Globe size={12} /> Playable
                </>
              )}
            </span>
            <small>{previewAdventure.location}</small>
          </div>
          <h3>{previewAdventure.title}</h3>
          <AccessStatusBanner access={previewAccess} />
          <p className="story-preview">{previewAdventure.story}</p>
          <p className="sponsor-inline">
            Sponsored by {getSponsorInfo(previewAdventure).name}
          </p>
          <div className="chips">
            <span>{previewAdventure.clues.length} clues</span>
            <span>{previewAdventure.prize}</span>
          </div>
          <button onClick={openAdventure}>
            {previewAccess.ctaLabel} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {!adventureMarkers.length && (
        <div className="card empty-vault">
          <MapPin size={28} />
          <p>No adventures with map locations in your area yet.</p>
        </div>
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
      <QuestoryMap
        mini
        clueMarkers={clueMarkers}
        className="play-mini-map"
      />
    </div>
  );
}
