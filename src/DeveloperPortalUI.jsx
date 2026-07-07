import React, { useMemo, useState } from 'react';
import { ArrowLeft, Book, Code, Webhook } from 'lucide-react';
import {
  buildApiSchema,
  getApiNamespace,
  API_NAMESPACES,
  getPlatformApiSnapshot,
} from './platformApiEngine';
import Questory from './questorySdk';
import { buildWebhookPayload, WEBHOOK_PROVIDERS } from './webhookEngine';
import { EVENT_TYPES } from './eventBusEngine';
import { isDev } from './config/env';

const TABS = [
  { id: 'docs', label: 'Documentation' },
  { id: 'api', label: 'API Browser' },
  { id: 'sdk', label: 'SDK Examples' },
  { id: 'webhooks', label: 'Webhook Tester' },
  { id: 'schema', label: 'JSON Schema' },
];

export function DeveloperPortal({ state, adventures = [], nav, isAdmin = false }) {
  const [tab, setTab] = useState('docs');
  const [selectedNs, setSelectedNs] = useState(API_NAMESPACES.ADVENTURES);
  const [sdkOutput, setSdkOutput] = useState('');

  const canView = isDev || isAdmin;
  const schema = useMemo(() => buildApiSchema(), []);
  const nsResult = useMemo(
    () => (canView ? getApiNamespace(state, selectedNs, adventures) : null),
    [state, selectedNs, adventures, canView]
  );

  if (!canView) {
    return (
      <div className="card empty-vault">
        <p>Developer Portal is restricted.</p>
        <button type="button" onClick={() => nav('home')}>Back</button>
      </div>
    );
  }

  const runSdkExample = () => {
    Questory.init({ state, adventures, apiKey: 'qst_test_demo' });
    const player = Questory.getPlayer();
    const adventure = Questory.getAdventure('union-depot-ghost');
    setSdkOutput(JSON.stringify({ player, adventure }, null, 2));
  };

  const webhookSample = buildWebhookPayload(
    WEBHOOK_PROVIDERS.DISCORD,
    EVENT_TYPES.ADVENTURE_COMPLETED,
    { adventureId: 'union-depot-ghost' }
  );

  return (
    <div className="developer-portal">
      <div className="section-head">
        <div>
          <h2>Developer Portal</h2>
          <p>API browser, SDK examples, webhook tester, schema explorer</p>
        </div>
        <button type="button" className="ghost" onClick={() => nav('platform-console')}>
          <ArrowLeft size={16} /> Platform Console
        </button>
      </div>

      <div className="vault-tabs-scroll">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'docs' && (
        <div className="card">
          <Book size={16} /> <h4>Questory Platform API</h4>
          <p>Versioned read-only snapshots. No mutations via API layer.</p>
          <ul>
            <li>Initialize SDK with Questory.init(&#123; state, adventures &#125;)</li>
            <li>Subscribe to events with Questory.subscribe()</li>
            <li>Webhooks are draft-only until production keys are configured</li>
          </ul>
        </div>
      )}

      {tab === 'api' && (
        <>
          <select value={selectedNs} onChange={(e) => setSelectedNs(e.target.value)}>
            {Object.values(API_NAMESPACES).map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <pre>{JSON.stringify(nsResult, null, 2)}</pre>
        </>
      )}

      {tab === 'sdk' && (
        <>
          <button type="button" onClick={runSdkExample}><Code size={14} /> Run SDK Example</button>
          <pre>{sdkOutput || '// Click Run SDK Example'}</pre>
        </>
      )}

      {tab === 'webhooks' && (
        <div className="card">
          <Webhook size={16} /> <h4>Webhook Tester (draft)</h4>
          <pre>{JSON.stringify(webhookSample, null, 2)}</pre>
          <p className="admin-meta">No HTTP dispatched — template preview only.</p>
        </div>
      )}

      {tab === 'schema' && (
        <pre>{JSON.stringify(schema, null, 2)}</pre>
      )}
    </div>
  );
}
