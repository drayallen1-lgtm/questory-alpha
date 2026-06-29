import React, { useEffect, useMemo, useState } from 'react';
import { isDev } from './config/env';
import { formatPinDistanceImperial, resolvePinVisual } from './mapDiscovery';
import {
  computeBlossomLayout,
  computeCategoryBlossomLayout,
  difficultyLabel,
} from './mapClusterBlossom';

function BlossomTooltip({ marker, mapState, accessOptions }) {
  const visual = resolvePinVisual(marker.adventure, mapState);
  const dist = marker.distanceM != null ? formatPinDistanceImperial(marker.distanceM) : null;
  const diff = difficultyLabel(marker.adventure?.difficulty);
  const reward = marker.adventure?.prize || '';

  return (
    <div className="blossom-pin-tooltip" role="tooltip">
      <strong>{marker.title || marker.adventure?.title || 'Adventure'}</strong>
      <span className="blossom-pin-tooltip-meta">
        {visual.label}
        {dist ? ` · ${dist}` : ''}
      </span>
      <span className="blossom-pin-tooltip-meta">
        {diff}
        {reward ? ` · ${reward}` : ''}
      </span>
    </div>
  );
}

function BlossomAdventurePin({
  marker,
  mapState,
  accessOptions,
  slot,
  dimmed,
  selected,
  onSelect,
  onHoverChange,
}) {
  const visual = resolvePinVisual(marker.adventure, mapState);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      className={[
        'blossom-pin',
        'questory-pin',
        'blossom-animate-in',
        'blossom-open-pulse',
        `pin-base-${visual.base.id}`,
        `pin-access-${marker.pinAccess || 'playable'}`,
        dimmed ? 'blossom-dimmed' : '',
        selected ? 'blossom-selected pin-solo-active blossom-selected-pulse' : '',
        hovered && !dimmed ? 'blossom-hover' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        '--pin-color': visual.base.color,
        '--pin-glow': visual.base.glow,
        '--blossom-delay': `${slot.index * 32}ms`,
        left: slot.x,
        top: slot.y,
      }}
      aria-label={marker.title || marker.adventure?.title || 'Adventure'}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (isDev) {
          console.debug('[QuestoryMap]', {
            adventureBlossomPinClicked: { adventureId: marker.id, title: marker.title },
          });
        }
        onSelect?.(marker);
      }}
      onMouseEnter={() => {
        setHovered(true);
        onHoverChange?.(marker.id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverChange?.(null);
      }}
    >
      <span className="questory-pin-icon">{visual.icon}</span>
      {hovered && !dimmed && (
        <BlossomTooltip marker={marker} mapState={mapState} accessOptions={accessOptions} />
      )}
    </button>
  );
}

function BlossomCategoryPin({ category, slot, onSelect }) {
  return (
    <button
      type="button"
      className="blossom-category blossom-animate-in"
      style={{
        '--blossom-delay': `${slot.index * 32}ms`,
        '--blossom-color': category.color || '#14b8a6',
        left: slot.x,
        top: slot.y,
      }}
      aria-label={`${category.label}, ${category.markers.length} adventures`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.(category.id);
      }}
    >
      <span className="blossom-category-icon">{category.icon}</span>
      <span className="blossom-category-label">
        {category.label} ({category.markers.length})
      </span>
    </button>
  );
}

function BlossomOverflowPin({ count, slot, dimmed, onSelect }) {
  return (
    <button
      type="button"
      className={['blossom-overflow', 'blossom-animate-in', dimmed ? 'blossom-dimmed' : '']
        .filter(Boolean)
        .join(' ')}
      style={{
        '--blossom-delay': '0ms',
        left: slot.x,
        top: slot.y,
      }}
      aria-label={`${count} more adventures`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (isDev) {
          console.debug('[QuestoryMap]', { overflowPickerOpened: { count } });
        }
        onSelect?.();
      }}
    >
      <span className="blossom-overflow-label">+{count} More</span>
    </button>
  );
}

/**
 * CSS-positioned blossom overlay — never uses Mapbox markers (avoids edge stacking).
 */
export function LivingClusterBlossomOverlay({
  map,
  livingCluster,
  mapState,
  accessOptions,
  onCategorySelect,
  onPinSelect,
  onOverflow,
  onHoverChange,
}) {
  const [center, setCenter] = useState(null);

  useEffect(() => {
    if (!map || !livingCluster?.coords || livingCluster.overflowOpen) {
      setCenter(null);
      return undefined;
    }

    const update = () => {
      const point = map.project(livingCluster.coords);
      const container = map.getContainer();
      setCenter({
        x: point.x,
        y: point.y,
        mapWidth: container.clientWidth,
        mapHeight: container.clientHeight,
      });
    };

    update();
    map.on('move', update);
    map.on('zoom', update);
    map.on('resize', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
      map.off('resize', update);
    };
  }, [
    map,
    livingCluster?.coords,
    livingCluster?.overflowOpen,
    livingCluster?.clusterId,
    livingCluster?.phase,
    livingCluster?.selectedId,
  ]);

  const layout = useMemo(() => {
    if (!livingCluster || livingCluster.overflowOpen) return null;
    if (livingCluster.phase === 'category') {
      return {
        kind: 'category',
        ...computeCategoryBlossomLayout(livingCluster.categories || []),
      };
    }
    return {
      kind: 'adventure',
      ...computeBlossomLayout((livingCluster.activeMarkers || []).length),
    };
  }, [livingCluster]);

  if (!center || !layout || !livingCluster || livingCluster.overflowOpen) return null;

  const edgeGuard = center.x <= 10 || center.x >= center.mapWidth - 10;
  if (edgeGuard && isDev) {
    console.debug('[QuestoryMap]', {
      leftEdgeMarkerGuardTriggered: {
        reason: 'blossom center near edge',
        x: center.x,
        mapWidth: center.mapWidth,
      },
    });
  }

  if (livingCluster.phase === 'category') {
    return (
      <div
        className="living-cluster-blossom"
        style={{ left: center.x, top: center.y, transform: 'translate(-50%, -50%)' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(livingCluster.categories || []).map((category, index) => {
          const slot = layout.slots[index];
          if (!slot) return null;
          return (
            <BlossomCategoryPin
              key={category.id}
              category={category}
              slot={{ ...slot, index }}
              onSelect={onCategorySelect}
            />
          );
        })}
      </div>
    );
  }

  const markers = livingCluster.activeMarkers || [];
  const selectedId = livingCluster.selectedId;
  const selectedMarker = selectedId ? markers.find((m) => m.id === selectedId) : null;
  const selectedInRing = Boolean(
    selectedMarker &&
      layout.slots.some(
        (slot) => slot.kind === 'item' && markers[slot.index]?.id === selectedId
      )
  );
  const selectedFromOverflow = Boolean(selectedMarker && !selectedInRing);

  return (
    <div
      className="living-cluster-blossom"
      style={{ left: center.x, top: center.y, transform: 'translate(-50%, -50%)' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {layout.slots.map((slot) => {
        if (slot.kind === 'overflow') {
          if (selectedFromOverflow) return null;
          return (
            <BlossomOverflowPin
              key="overflow"
              count={layout.overflowCount}
              slot={slot}
              dimmed={Boolean(selectedId)}
              onSelect={onOverflow}
            />
          );
        }

        const marker = markers[slot.index];
        if (!marker) return null;
        const dimmed = Boolean(selectedId && selectedId !== marker.id);
        const selected = selectedId === marker.id;

        return (
          <BlossomAdventurePin
            key={marker.id}
            marker={marker}
            mapState={mapState}
            accessOptions={accessOptions}
            slot={slot}
            dimmed={dimmed}
            selected={selected}
            onSelect={onPinSelect}
            onHoverChange={onHoverChange}
          />
        );
      })}

      {selectedFromOverflow && selectedMarker && (
        <BlossomAdventurePin
          key={`selected-${selectedMarker.id}`}
          marker={selectedMarker}
          mapState={mapState}
          accessOptions={accessOptions}
          slot={{ x: 0, y: 0, index: 0, kind: 'item' }}
          dimmed={false}
          selected
          onSelect={onPinSelect}
          onHoverChange={onHoverChange}
        />
      )}
    </div>
  );
}
