import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Building2,
  Key,
  Layers,
  Package,
  Palette,
  Webhook,
} from 'lucide-react';
import {
  buildApiSchema,
  createApiKey,
  getPlatformApiSnapshot,
  API_NAMESPACES,
} from './platformApiEngine';
import { getWhiteLabelSnapshot, ADVENTURE_TEMPLATES } from './whiteLabelEngine';
import { getEnterpriseSnapshot } from './enterpriseEngine';
import { getWebhookSnapshot, draftWebhookEndpoint, WEBHOOK_PROVIDERS } from './webhookEngine';
import { getEventBusSnapshot } from './eventBusEngine';
import { isDev } from './config/env';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'organizations', label: 'Organizations' },
  { id: 'apikeys', label: 'API Keys' },
  { id: 'extensions', label: 'Extensions' },
  { id: 'templates', label: 'Templates' },
  { id: 'brands', label: 'Brand Packs' },
  { id: 'webhooks', label: 'Webhook Logs' },
  { id: 'partners', label: 'Partner Apps' },
  { id: 'sdk', label: 'SDK Usage' },
];

export function PlatformConsole({ state, setState, adventures = [], nav, isAdmin = false }) {
  const [tab, setTab] = useState('overview');
  const [message, setMessage] = useState('');

  const canView = isDev || isAdmin;
  const api = useMemo(
    () => (canView ? getPlatformApiSnapshot(state, adventures) : null),
    [state, adventures, canView]
  );
  const whiteLabel = useMemo(() => (canView ? getWhiteLabelSnapshot(state) : null), [state, canView]);
  const enterprise = useMemo(() => (canView ? getEnterpriseSnapshot(state) : null), [state, canView]);
  const webhooks = useMemo(() => (canView ? getWebhookSnapshot(state) : null), [state, canView]);
  const events = useMemo(() => (canView ? getEventBusSnapshot(state) : null), [state, canView]);
  const schema = useMemo(() => buildApiSchema(), []);

  if (!canView) {
    return (
      <div className="card empty-vault">
        <p>Platform Console is restricted to administrators.</p>
        <button type="button" onClick={() => nav('home')}>Back</button>
      </div>
    );
  }

  const handleCreateKey = () => {
    const result = createApiKey(state, { label: 'Console Key', scopes: ['adventures', 'players'] });
    setState(result.state);
    setMessage('API key drafted (simulated).');
  };

  const handleDraftWebhook = () => {
    const result = draftWebhookEndpoint(state, { provider: WEBHOOK_PROVIDERS.SLACK });
    setState(result.state);
    setMessage('Webhook endpoint drafted.');
  };

  return (
    <div className="platform-console">
      <div className="section-head">
        <div>
          <h2>Platform Console</h2>
          <p>Open Questory Platform — API, extensions, white label, enterprise</p>
        </div>
        <button type="button" className="ghost" onClick={() => nav('admin')}>
          <ArrowLeft size={16} /> Admin
        </button>
      </div>

      <span className="platform-api-badge">API {api?.version} · Read-only · No live integrations</span>
      {message && <p className="draft-sync-banner" role="status">{message}</p>}

      <div className="vault-tabs-scroll">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && api && (
        <>
          <div className="grid creator-metrics-row">
            <div className="card mini"><small>Namespaces</small><strong>{api.stats.namespaceCount}</strong></div>
            <div className="card mini"><small>Adventures</small><strong>{api.stats.adventureCount}</strong></div>
            <div className="card mini"><small>API Keys</small><strong>{api.stats.apiKeyCount}</strong></div>
            <div className="card mini"><small>Events</small><strong>{events?.stats.total || 0}</strong></div>
          </div>
          <div className="platform-ns-grid">
            {Object.values(API_NAMESPACES).map((ns) => (
              <div key={ns} className="platform-ns-card card mini">
                <Layers size={14} /> <strong>{ns}</strong>
                <p className="admin-meta">GET only</p>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'organizations' && enterprise && (
        <div className="payments-queue-list">
          {enterprise.organizations.map((org) => (
            <div key={org.id} className="card">
              <Building2 size={16} /> <strong>{org.name}</strong>
              <p>{org.plan} · {org.teams?.length || 0} teams · SSO: {org.ssoEnabled ? 'on' : 'placeholder'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'apikeys' && api && (
        <>
          <button type="button" onClick={handleCreateKey}><Key size={14} /> Create API Key</button>
          <div className="payments-queue-list">
            {api.apiKeys.map((k) => (
              <div key={k.id} className="card">
                <strong>{k.label}</strong>
                <p>{k.prefix}*** · {k.scopes?.join(', ')}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'extensions' && whiteLabel && (
        <div className="payments-queue-list">
          {whiteLabel.extensions.map((ext) => (
            <div key={ext.id} className="card">
              <Package size={14} /> <strong>{ext.label}</strong>
              <p>v{ext.version} · {whiteLabel.installedExtensions.some((i) => i.id === ext.id) ? 'installed' : 'available'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'templates' && whiteLabel && (
        <div className="platform-ns-grid">
          {Object.values(ADVENTURE_TEMPLATES).map((t) => (
            <div key={t.id} className="card mini platform-ns-card">
              <span>{t.icon}</span>
              <strong>{t.label}</strong>
              <p className="admin-meta">{t.durationMin}m</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'brands' && whiteLabel && (
        <div className="card">
          <Palette size={16} /> <strong>{whiteLabel.activeBrand.name}</strong>
          <p>Primary {whiteLabel.activeBrand.primaryColor} · Logo {whiteLabel.activeBrand.logo}</p>
          <div className="chips">
            {Object.entries(whiteLabel.activeBrand.terminology || {}).map(([k, v]) => (
              <span key={k}>{k}: {v}</span>
            ))}
          </div>
        </div>
      )}

      {tab === 'webhooks' && webhooks && (
        <>
          <button type="button" onClick={handleDraftWebhook}><Webhook size={14} /> Draft Webhook</button>
          <div className="payments-queue-list">
            {webhooks.endpoints.map((e) => (
              <div key={e.id} className="card">
                <strong>{e.provider}</strong>
                <p>{e.status} · {e.url}</p>
              </div>
            ))}
            {webhooks.log.map((l) => (
              <p key={l.id} className="admin-meta">{l.eventType} · {l.note}</p>
            ))}
          </div>
        </>
      )}

      {tab === 'partners' && api && (
        <div className="payments-queue-list">
          {(api.namespaces.partners || []).slice(0, 8).map((p) => (
            <div key={p.id} className="card">
              <Box size={14} /> <strong>{p.name}</strong>
              <p>{p.type}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'sdk' && (
        <div className="card">
          <p>Sessions: {state?.platform?.sdkSessions?.length || 0}</p>
          <p className="admin-meta">Questory.init · login · getAdventure · claim · subscribe</p>
        </div>
      )}
    </div>
  );
}
