/**
 * Questory 2.0 — Phase 18: Questory SDK
 * Future-ready client interface — wraps platform API read-only snapshots.
 */
import { API_NAMESPACES, getApiNamespace, getPlatformApiSnapshot } from './platformApiEngine.js';
import { publishEvent, EVENT_TYPES } from './eventBusEngine.js';

let _config = {
  apiKey: null,
  version: 'v1',
  orgId: null,
};

let _state = null;
let _adventures = [];
let _listeners = new Map();

function ensureReady() {
  if (!_state) {
    throw new Error('Questory SDK not initialized. Call Questory.init() first.');
  }
}

function emitLocal(event, payload) {
  const handlers = _listeners.get(event) || [];
  handlers.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* subscriber error */
    }
  });
}

export const Questory = {
  init(config = {}) {
    _config = { ..._config, ...config };
    _state = config.state || _state;
    _adventures = config.adventures || _adventures;
    return { ok: true, version: _config.version };
  },

  setContext(state, adventures = []) {
    _state = state;
    _adventures = adventures;
  },

  login(credentials = {}) {
    ensureReady();
    const player = getApiNamespace(_state, API_NAMESPACES.PLAYERS, _adventures);
    publishEvent(_state, EVENT_TYPES.PLAYER_LOGIN, { userId: credentials.userId || 'local' });
    emitLocal('login', player.data);
    return { ok: true, player: player.data, simulated: true };
  },

  getAdventure(adventureId) {
    ensureReady();
    const ns = getApiNamespace(_state, API_NAMESPACES.ADVENTURES, _adventures);
    const adventure = ns.data?.find((a) => a.id === adventureId) || null;
    return adventure;
  },

  getMap() {
    ensureReady();
    const discoveries = getApiNamespace(_state, API_NAMESPACES.DISCOVERIES, _adventures);
    const living = getApiNamespace(_state, API_NAMESPACES.LIVINGWORLD, _adventures);
    return {
      discoveries: discoveries.data,
      livingWorld: living.data,
    };
  },

  claim(adventureId, payload = {}) {
    ensureReady();
    publishEvent(_state, EVENT_TYPES.CLAIM_SUBMITTED, { adventureId, ...payload });
    emitLocal('claim', { adventureId, status: 'submitted', simulated: true });
    return { ok: true, message: 'Claim routed via SDK (simulated).', adventureId, simulated: true };
  },

  getPlayer() {
    ensureReady();
    return getApiNamespace(_state, API_NAMESPACES.PLAYERS, _adventures).data;
  },

  getMarketplace() {
    ensureReady();
    return getApiNamespace(_state, API_NAMESPACES.MARKETPLACE, _adventures).data;
  },

  subscribe(event, handler) {
    if (!_listeners.has(event)) _listeners.set(event, []);
    _listeners.get(event).push(handler);
    return () => {
      const list = _listeners.get(event) || [];
      _listeners.set(
        event,
        list.filter((fn) => fn !== handler)
      );
    };
  },

  events() {
    ensureReady();
    return getPlatformApiSnapshot(_state, _adventures).namespaces;
  },

  getSnapshot() {
    ensureReady();
    return getPlatformApiSnapshot(_state, _adventures);
  },
};

export default Questory;
