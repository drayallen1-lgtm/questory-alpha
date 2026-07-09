import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressiveLayer } from '../../src/ProgressiveLayer.jsx';
import { WORLD_LAYER_IDS } from '../../src/progressiveWorldLayersEngine.js';

describe('ProgressiveLayer', () => {
  it('skips empty fullscreen wrappers when children are falsy', () => {
    const layers = {
      [WORLD_LAYER_IDS.DISCOVERY]: { opacity: 1, visible: true, label: 'Discovery' },
    };
    const html = renderToStaticMarkup(
      React.createElement(
        ProgressiveLayer,
        { layerId: WORLD_LAYER_IDS.DISCOVERY, layers },
        false,
        null
      )
    );
    expect(html).toBe('');
  });

  it('renders wrapper when children exist', () => {
    const layers = {
      [WORLD_LAYER_IDS.MARKETPLACE]: { opacity: 1, visible: true, label: 'Market' },
    };
    const html = renderToStaticMarkup(
      React.createElement(
        ProgressiveLayer,
        { layerId: WORLD_LAYER_IDS.MARKETPLACE, layers },
        React.createElement('span', { 'data-testid': 'child' }, 'pin')
      )
    );
    expect(html).toContain('world-progressive-layer--marketplace');
  });
});
