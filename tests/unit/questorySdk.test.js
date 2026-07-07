import { describe, expect, it } from 'vitest';
import Questory from '../../src/questorySdk.js';
import { buildTestState } from './fixtures.js';

describe('questorySdk', () => {
  it('init and getPlayer work', () => {
    const state = buildTestState({ coins: 100 });
    Questory.init({ state, adventures: state.adventures });
    const player = Questory.getPlayer();
    expect(player.coins).toBe(100);
  });

  it('getAdventure returns published adventure', () => {
    const state = buildTestState();
    Questory.init({ state, adventures: state.adventures });
    const adv = Questory.getAdventure('union-depot-ghost');
    expect(adv?.id).toBe('union-depot-ghost');
  });

  it('claim returns simulated ok', () => {
    const state = buildTestState();
    Questory.init({ state, adventures: state.adventures });
    const result = Questory.claim('union-depot-ghost', { code: 'TEST' });
    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
  });
});
