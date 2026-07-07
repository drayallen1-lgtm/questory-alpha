import { describe, expect, it } from 'vitest';
import {
  draftWebhookEndpoint,
  getWebhookSnapshot,
  WEBHOOK_PROVIDERS,
} from '../../src/webhookEngine.js';
import { buildTestState } from './fixtures.js';

describe('webhookEngine', () => {
  it('snapshot has draft endpoints', () => {
    const snapshot = getWebhookSnapshot(buildTestState());
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.liveDispatchEnabled).toBe(false);
    expect(snapshot.endpoints.length).toBeGreaterThan(0);
  });

  it('draftWebhookEndpoint creates draft', () => {
    const result = draftWebhookEndpoint(buildTestState(), { provider: WEBHOOK_PROVIDERS.SLACK });
    expect(result.ok).toBe(true);
    expect(result.endpoint.status).toBe('draft');
  });
});
