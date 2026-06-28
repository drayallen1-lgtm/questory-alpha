/**
 * Living Cluster — radial blossom layout around cluster center (pixel space).
 */
import { formatPinDistanceImperial, resolvePinBaseType, resolvePinVisual } from './mapDiscovery';
import { evaluateAccessContext } from './accessRules';
import { isDev } from './config/env';

export const BLOSSOM_MAX_PINS = 8;
export const BLOSSOM_RADIUS_MIN = 55;
export const BLOSSOM_RADIUS_MAX = 90;
export const BLOSSOM_ANIM_MS = 260;

const DIFFICULTY_LABELS = ['Easy', 'Easy', 'Moderate', 'Challenging', 'Expert', 'Legendary'];

export function difficultyLabel(level) {
  const n = Number(level) || 2;
  return DIFFICULTY_LABELS[Math.min(Math.max(n, 1), 5)] || 'Moderate';
}

/** Group cluster adventures by base pin category. */
export function groupMarkersByCategory(markers, mapState = null) {
  const groups = new Map();
  for (const marker of markers) {
    const base = resolvePinBaseType(marker.adventure);
    if (!groups.has(base.id)) {
      groups.set(base.id, {
        id: base.id,
        icon: base.icon,
        label: base.label,
        color: base.color,
        markers: [],
      });
    }
    groups.get(base.id).markers.push(marker);
  }
  return [...groups.values()].sort((a, b) => b.markers.length - a.markers.length);
}

/**
 * Radial positions in pixels around center. Overflow hub sits at center.
 * @returns {{ slots: Array, radius: number, overflowCount: number }}
 */
export function computeBlossomLayout(itemCount, options = {}) {
  const maxPins = options.maxPins ?? BLOSSOM_MAX_PINS;
  const visibleCount = Math.min(itemCount, maxPins);
  const overflowCount = Math.max(0, itemCount - maxPins);
  const ringCount = visibleCount;
  const radius = Math.min(
    BLOSSOM_RADIUS_MAX,
    Math.max(BLOSSOM_RADIUS_MIN, BLOSSOM_RADIUS_MIN + ringCount * 4)
  );

  const slots = [];

  if (overflowCount > 0) {
    slots.push({ kind: 'overflow', x: 0, y: 0, index: -1, overflowCount });
  }

  for (let i = 0; i < ringCount; i += 1) {
    const angle = (2 * Math.PI * i) / ringCount - Math.PI / 2;
    slots.push({
      kind: 'item',
      index: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return { slots, radius, overflowCount, visibleCount };
}

export function computeCategoryBlossomLayout(categories) {
  return computeBlossomLayout(categories.length, { maxPins: categories.length });
}

export function buildBlossomTooltipHtml(marker, mapState, accessOptions = {}) {
  const visual = resolvePinVisual(marker.adventure, mapState);
  const access = marker.access || evaluateAccessContext(marker.adventure, accessOptions);
  const dist =
    marker.distanceM != null ? formatPinDistanceImperial(marker.distanceM) : null;
  const diff = difficultyLabel(marker.adventure?.difficulty);
  const reward = marker.adventure?.prize || '';

  return `<strong>${marker.title || marker.adventure?.title || 'Adventure'}</strong>
    <span class="blossom-pin-tooltip-meta">${visual.label}${dist ? ` · ${dist}` : ''}</span>
    <span class="blossom-pin-tooltip-meta">${diff}${reward ? ` · ${reward}` : ''}</span>`;
}

export function livingClusterPhase(state) {
  if (!state) return 'CLUSTER_VIEW';
  if (state.overflowOpen) return 'OVERFLOW_PICKER';
  if (state.selectedId) return 'ADVENTURE_ACTIVE';
  if (state.phase === 'category') return 'CATEGORY_BLOSSOM';
  return 'ADVENTURE_BLOSSOM';
}

export function createBlossomAdventureElement(marker, visual, { dimmed = false, selected = false, animIndex = 0 } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = [
    'blossom-pin',
    'questory-pin',
    `pin-base-${visual.base.id}`,
    `pin-access-${marker.pinAccess || 'playable'}`,
    dimmed ? 'blossom-dimmed' : '',
    selected ? 'blossom-selected pin-solo-active' : '',
    selected ? 'blossom-selected-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ');
  el.style.setProperty('--pin-color', visual.base.color);
  el.style.setProperty('--pin-glow', visual.base.glow);
  el.style.setProperty('--blossom-delay', `${animIndex * 32}ms`);
  el.setAttribute('aria-label', marker.title || marker.adventure?.title || 'Adventure');
  el.innerHTML = `<span class="questory-pin-icon">${visual.icon}</span>`;
  return el;
}

export function createBlossomOverflowElement(count) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'blossom-overflow';
  el.setAttribute('aria-label', `${count} more adventures`);
  el.innerHTML = `<span class="blossom-overflow-label">+${count} More</span>`;
  return el;
}

export function createBlossomCategoryElement(category, animIndex = 0) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'blossom-category';
  el.style.setProperty('--blossom-delay', `${animIndex * 32}ms`);
  el.style.setProperty('--blossom-color', category.color || '#14b8a6');
  el.setAttribute('aria-label', `${category.label}, ${category.markers.length} adventures`);
  el.innerHTML = `
    <span class="blossom-category-icon">${category.icon}</span>
    <span class="blossom-category-label">${category.label} (${category.markers.length})</span>
  `;
  return el;
}

export function wireBlossomAdventureElement(
  el,
  { marker, mapState, accessOptions = {}, onSelect, onHoverChange, getTooltipHtml }
) {
  if (!el || el.dataset.blossomWired === '1') return;
  el.dataset.blossomWired = '1';

  let tooltipEl = el.querySelector('.blossom-pin-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'blossom-pin-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.hidden = true;
    el.appendChild(tooltipEl);
  }

  const showTooltip = () => {
    if (getTooltipHtml) {
      tooltipEl.innerHTML = getTooltipHtml(marker, mapState, accessOptions);
    }
    tooltipEl.hidden = false;
    el.classList.add('blossom-hover');
  };

  const hideTooltip = () => {
    tooltipEl.hidden = true;
    el.classList.remove('blossom-hover');
    onHoverChange?.(null);
  };

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDev) {
      console.debug('[QuestoryMap]', {
        pinClicked: { adventureId: marker.id, title: marker.title },
        fromBlossom: true,
      });
    }
    onSelect?.(marker);
  });

  el.addEventListener('mouseenter', () => {
    onHoverChange?.(marker.id);
    showTooltip();
  });

  el.addEventListener('mouseleave', hideTooltip);
  el.addEventListener('focus', showTooltip);
  el.addEventListener('blur', hideTooltip);
}
