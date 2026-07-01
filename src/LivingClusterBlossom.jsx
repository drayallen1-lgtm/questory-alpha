import React, { useEffect, useMemo, useState } from 'react';
import { isDev } from './config/env';
import { formatPinDistanceImperial, resolvePinVisual } from './mapDiscovery';
import {
  computeBlossomLayout,
  computeCategoryBlossomLayout,
  difficultyLabel,
} from './mapClusterBlossom';
import { DISCOVERY_BLOOM_TIMING } from './mapUiCues';

function BlossomTooltip({ marker, mapState }) {
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

function blossomSlotStyle(slot, staggerMs) {
  return {
    '--blossom-x': `${slot.x}px`,
    '--blossom-y': `${slot.y}px`,
    '--blossom-delay': `${(slot.index ?? 0) * staggerMs}ms`,
    left: slot.x,
    top: slot.y,
  };
}

function BlossomAdventurePin({
  marker,
  mapState,
  slot,
  dimmed,
  selected,
  pinSelecting,
  onSelect,
  onHoverChange,
}) {
  const visual = resolvePinVisual(marker.adventure, mapState);
  const [hovered, setHovered] = useState(false);
  const overlayIds = visual?.overlayIds || [];

  return (
    <button
      type="button"
      className={[
        'blossom-pin',
        'questory-pin',
        'blossom-pin-bloom',
        `pin-base-${visual.base.id}`,
        `pin-access-${marker.pinAccess || 'playable'}`,
        overlayIds.includes('event') ? 'pin-has-event' : '',
        dimmed ? 'blossom-dimmed' : '',
        selected ? 'blossom-selected pin-solo-active' : '',
        hovered && !dimmed ? 'blossom-hover' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...blossomSlotStyle(slot, DISCOVERY_BLOOM_TIMING.ADVENTURE_STAGGER_MS),
        '--pin-color': visual.base.color,
        '--pin-glow': visual.base.glow,
      }}
      aria-label={marker.title || marker.adventure?.title || 'Adventure'}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.(marker);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(marker);
        }
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
      {selected && pinSelecting && <span className="selected-pin-ripple" aria-hidden="true" />}
      {selected && <span className="selected-pin-ring" aria-hidden="true" />}
      <span className="questory-pin-icon">{visual.icon}</span>
      {hovered && !dimmed && <BlossomTooltip marker={marker} mapState={mapState} />}
    </button>
  );
}

function BlossomCategoryPin({ category, slot, dimmed, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      className={[
        'blossom-category',
        'blossom-category-burst',
        dimmed ? 'blossom-category-dimmed' : '',
        selected ? 'blossom-category-selected-pulse' : '',
        hovered && !dimmed ? 'blossom-category-hover' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...blossomSlotStyle(slot, DISCOVERY_BLOOM_TIMING.CATEGORY_STAGGER_MS),
        '--blossom-color': category.color || '#14b8a6',
      }}
      aria-label={`${category.label}, ${category.markers.length} adventures`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.(category.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(category.id);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="blossom-category-icon">{category.icon}</span>
      <span className="blossom-category-label">
        {category.label} ({category.markers.length})
      </span>
      {hovered && !dimmed && (
        <span className="blossom-category-tooltip" role="tooltip">
          {category.label} · {category.markers.length} adventures
        </span>
      )}
    </button>
  );
}

function BlossomOverflowPin({ count, slot, dimmed, onSelect }) {
  return (
    <button
      type="button"
      className={[
        'blossom-overflow',
        'blossom-pin-bloom',
        'blossom-overflow-pulse',
        dimmed ? 'blossom-dimmed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={blossomSlotStyle(slot, 0)}
      aria-label={`${count} more adventures`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.();
      }}
    >
      <span className="blossom-overflow-label">+{count} More</span>
    </button>
  );
}

function BloomAmbient({ livingCluster, category }) {
  const color = category?.color || livingCluster?.meta?.dominant?.color || 'rgba(94, 234, 212, 0.14)';
  const isCategory = livingCluster?.phase === 'category' || livingCluster?.categoryTransition;
  return (
    <div
      className={`discovery-bloom-ambient${isCategory ? ' category-aura' : ''}`}
      style={{ '--bloom-ambient-color': color }}
      aria-hidden="true"
    />
  );
}

/**
 * CSS-positioned blossom overlay — never uses Mapbox markers (avoids edge stacking).
 */
export function LivingClusterBlossomOverlay({
  map,
  livingCluster,
  mapState,
  onCategorySelect,
  onPinSelect,
  onOverflow,
  onHoverChange,
}) {
  const [center, setCenter] = useState(null);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    setEntering(true);
    const t = window.setTimeout(() => setEntering(false), DISCOVERY_BLOOM_TIMING.BLOSSOM_ENTER + 80);
    return () => window.clearTimeout(t);
  }, [livingCluster?.clusterId, livingCluster?.phase, livingCluster?.categoryId]);

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
    const showCategory =
      livingCluster.phase === 'category' || Boolean(livingCluster.categoryTransition);
    if (showCategory) {
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

  const activeCategory = livingCluster.categories?.find(
    (c) => c.id === (livingCluster.categoryTransition || livingCluster.categoryId)
  );

  const blossomClass = [
    'living-cluster-blossom',
    entering ? 'blossom-entering' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rootStyle = {
    left: center.x,
    top: center.y,
    transform: 'translate(-50%, -50%)',
  };

  if (layout.kind === 'category' || livingCluster.phase === 'category' || livingCluster.categoryTransition) {
    const transitionId = livingCluster.categoryTransition;
    return (
      <div
        className={blossomClass}
        style={rootStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <BloomAmbient livingCluster={livingCluster} category={activeCategory} />
        {(livingCluster.categories || []).map((category, index) => {
          const slot = layout.slots[index];
          if (!slot) return null;
          const dimmed = Boolean(transitionId && transitionId !== category.id);
          const selected = transitionId === category.id;
          return (
            <BlossomCategoryPin
              key={category.id}
              category={category}
              slot={{ ...slot, index }}
              dimmed={dimmed}
              selected={selected}
              onSelect={onCategorySelect}
            />
          );
        })}
      </div>
    );
  }

  const markers = livingCluster.activeMarkers || [];
  const selectedId = livingCluster.selectedId;
  const pinSelecting = Boolean(livingCluster.pinSelecting);
  const selectedMarker = selectedId ? markers.find((m) => m.id === selectedId) : null;
  const selectedInRing = Boolean(
    selectedMarker &&
      layout.slots.some((slot) => slot.kind === 'item' && markers[slot.index]?.id === selectedId)
  );
  const selectedFromOverflow = Boolean(selectedMarker && !selectedInRing);

  return (
    <div
      className={blossomClass}
      style={rootStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <BloomAmbient livingCluster={livingCluster} category={activeCategory} />
      {layout.slots.map((slot, slotIndex) => {
        if (slot.kind === 'overflow') {
          if (selectedFromOverflow) return null;
          return (
            <BlossomOverflowPin
              key="overflow"
              count={layout.overflowCount}
              slot={{ ...slot, index: slotIndex }}
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
            slot={{ ...slot, index: slot.index }}
            dimmed={dimmed}
            selected={selected}
            pinSelecting={pinSelecting && selected}
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
          slot={{ x: 0, y: 0, index: 0, kind: 'item' }}
          dimmed={false}
          selected
          pinSelecting={pinSelecting}
          onSelect={onPinSelect}
          onHoverChange={onHoverChange}
        />
      )}
    </div>
  );
}
