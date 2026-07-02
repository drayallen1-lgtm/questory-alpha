import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Lock, Sparkles, Unlock } from 'lucide-react';
import {
  CODEX_CATEGORY_META,
  CODEX_CATEGORIES,
  getCodexSnapshot,
  markCodexEntrySeen,
} from './codexEngine';

function rarityClass(rarity) {
  return `codex-rarity-${rarity || 'common'}`;
}

function CodexEntryRow({ entry, onSelect }) {
  return (
    <button
      type="button"
      className={`codex-entry-row ${entry.unlocked ? 'unlocked' : 'locked'} ${rarityClass(entry.rarity)}`}
      onClick={() => onSelect?.(entry)}
    >
      <span className="codex-entry-icon">{entry.icon}</span>
      <span className="codex-entry-body">
        <strong>{entry.title}</strong>
        {entry.subtitle && <small>{entry.subtitle}</small>}
      </span>
      <span className="codex-entry-status">
        {entry.unlocked ? <Unlock size={14} /> : <Lock size={14} />}
      </span>
    </button>
  );
}

function CodexCategoryPanel({ category, onSelectEntry }) {
  if (!category?.entries?.length) {
    return (
      <p className="admin-meta codex-empty">
        No entries yet. Explore the world to fill this archive.
      </p>
    );
  }

  return (
    <div className="codex-category-panel">
      <div className="codex-category-progress">
        <div className="progress compact">
          <i style={{ width: `${category.pct}%` }} />
        </div>
        <small>
          {category.unlockedCount}/{category.totalCount} recorded · {category.pct}%
        </small>
      </div>
      <div className="codex-entry-list">
        {category.entries.map((entry) => (
          <CodexEntryRow key={entry.id} entry={entry} onSelect={onSelectEntry} />
        ))}
      </div>
    </div>
  );
}

function CodexEntryDetail({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="card codex-entry-detail">
      <button type="button" className="codex-detail-close" onClick={onClose}>
        ← Back
      </button>
      <div className="codex-detail-head">
        <span className="codex-detail-icon">{entry.icon}</span>
        <div>
          <h4>{entry.title}</h4>
          {entry.subtitle && <p>{entry.subtitle}</p>}
        </div>
      </div>
      {entry.body && <p className="codex-detail-body">{entry.body}</p>}
      {entry.relationship && (
        <p className="codex-detail-chip">Relationship: {entry.relationship}</p>
      )}
      {entry.trust != null && (
        <p className="codex-detail-meta">Trust level: {entry.trust}</p>
      )}
      {entry.keyMemories?.length > 0 && (
        <div className="codex-npc-memories">
          <small>Key memories</small>
          <ul>
            {entry.keyMemories.map((m) => (
              <li key={m}>{m.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}
      {entry.storyArcChapter && (
        <p className="codex-detail-meta">
          Story arc: {entry.storyArcChapter} ({entry.storyArcStatus})
        </p>
      )}
      {entry.questsCompleted?.length > 0 && (
        <p className="codex-detail-meta">Quests completed: {entry.questsCompleted.length}</p>
      )}
      {entry.typeLabel && (
        <span className="codex-detail-chip">{entry.typeLabel}</span>
      )}
      {!entry.unlocked && (
        <p className="codex-detail-locked">
          <Lock size={14} /> Not yet discovered — keep exploring.
        </p>
      )}
    </div>
  );
}

export function CodexHub({ state, adventures, onStateChange, nav }) {
  const snapshot = useMemo(
    () => getCodexSnapshot(state, adventures),
    [state, adventures]
  );
  const [activeCategory, setActiveCategory] = useState(CODEX_CATEGORIES.LORE);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const category = snapshot.categories.find((c) => c.id === activeCategory);

  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    if (entry.unlocked && onStateChange) {
      onStateChange(markCodexEntrySeen(state, entry.id));
    }
  };

  return (
    <div className="codex-hub">
      <div className="card codex-hub-head">
        <h3>
          <BookOpen size={18} /> Questory Codex
        </h3>
        <p>
          Your explorer&apos;s journal — creatures, relics, lore, landmarks, AR memories, and every
          world you uncover.
        </p>
        <div className="codex-stats-grid">
          <div className="codex-stat">
            <strong>{snapshot.stats.overallPct}%</strong>
            <small>Archive filled</small>
          </div>
          <div className="codex-stat">
            <strong>{snapshot.stats.unlockedTotal}</strong>
            <small>Entries recorded</small>
          </div>
          <div className="codex-stat">
            <strong>{snapshot.stats.relicsOwned}</strong>
            <small>Relics</small>
          </div>
          <div className="codex-stat">
            <strong>{snapshot.stats.npcsMet}</strong>
            <small>NPCs met</small>
          </div>
        </div>
        <div className="progress compact codex-overall-bar">
          <i style={{ width: `${snapshot.stats.overallPct}%` }} />
        </div>
        {snapshot.newCount > 0 && (
          <p className="codex-new-banner">
            <Sparkles size={14} /> {snapshot.newCount} new entries since your last visit
          </p>
        )}
      </div>

      {snapshot.featured.length > 0 && (
        <div className="codex-featured-row">
          {snapshot.featured.map((f) => (
            <button
              key={f.id}
              type="button"
              className="codex-featured-chip"
              onClick={() => setActiveCategory(f.id)}
            >
              <span>{f.icon}</span>
              <span>
                {f.label}
                <small>{f.pct}%</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      )}

      <div className="codex-badge-row">
        {snapshot.discoveryBadges.map((badge) => (
          <span
            key={badge.id}
            className={`codex-badge-chip ${badge.unlocked ? 'unlocked' : 'locked'}`}
            title={badge.label}
          >
            {badge.icon} {badge.label}
          </span>
        ))}
      </div>

      <div className="vault-tabs-scroll codex-tabs">
        {snapshot.categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={activeCategory === cat.id ? 'active' : ''}
            onClick={() => {
              setActiveCategory(cat.id);
              setSelectedEntry(null);
            }}
          >
            {cat.icon} {cat.label}
            <small>{cat.unlockedCount}/{cat.totalCount}</small>
          </button>
        ))}
      </div>

      {selectedEntry ? (
        <CodexEntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      ) : (
        <div className="card">
          <h4>
            {CODEX_CATEGORY_META[activeCategory]?.icon}{' '}
            {CODEX_CATEGORY_META[activeCategory]?.label}
          </h4>
          <p className="admin-meta">{CODEX_CATEGORY_META[activeCategory]?.subtitle}</p>
          <CodexCategoryPanel category={category} onSelectEntry={handleSelectEntry} />
        </div>
      )}

      {snapshot.recentUnlocks.length > 0 && !selectedEntry && (
        <div className="card codex-recent">
          <h4>Recent discoveries</h4>
          <div className="codex-entry-list compact">
            {snapshot.recentUnlocks.map((entry) => (
              <CodexEntryRow key={entry.id} entry={entry} onSelect={handleSelectEntry} />
            ))}
          </div>
        </div>
      )}

      {nav && (
        <button type="button" className="btn secondary codex-world-link" onClick={() => nav('world')}>
          Open World tab for live events <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
