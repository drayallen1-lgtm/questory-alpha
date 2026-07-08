import { describe, expect, it } from 'vitest';
import { resolveMicroHudChips } from '../../src/microHudEngine.js';

describe('microHudEngine', () => {
  it('surfaces compact legendary chip when boss is active', () => {
    const snapshot = resolveMicroHudChips({
      legendaryHunt: {
        hasActiveBoss: true,
        worldBoss: { name: 'The Forgotten Miner' },
        alerts: [{ text: 'Only 6 hours remain.' }],
      },
      marketplace: {},
      faction: {},
    });
    expect(snapshot.chips[0].id).toBe('legendary');
    expect(snapshot.chips[0].shortLabel).toBeTruthy();
  });

  it('limits to two chips maximum', () => {
    const snapshot = resolveMicroHudChips({
      legendaryHunt: { hasActiveBoss: true, worldBoss: { name: 'Boss' } },
      marketplace: { listings: [{ id: '1' }, { id: '2' }], auctions: [{ id: 'a' }] },
      faction: { wars: [{ name: 'War' }], contestedCount: 1 },
    });
    expect(snapshot.chipCount).toBeLessThanOrEqual(2);
  });
});
