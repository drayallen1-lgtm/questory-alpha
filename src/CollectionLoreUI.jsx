import React, { useState } from 'react';
import { BookOpen, Globe, Lock, Sparkles, Unlock } from 'lucide-react';
import {
  getAllCollectionStories,
  getVictoryLoreReveal,
  LORE_TYPE_META,
} from './loreCollectionsEngine';

export function CollectionLoreUnlockBanner({ adventure, state, progress }) {
  const reveal = getVictoryLoreReveal(state, adventure, progress);
  if (!reveal?.entries?.length) return null;

  const newlyUnlocked = reveal.entries.filter((e) => e.unlocked);

  return (
    <div className="card collection-lore-unlock-banner">
      <h4>
        <Sparkles size={16} /> {reveal.storyTitle || reveal.collectionName} · Lore Unlocked
      </h4>
      {reveal.storyIntro && <p className="collection-lore-intro">{reveal.storyIntro}</p>}
      <div className="collection-lore-unlock-grid">
        {newlyUnlocked.map((entry) => (
          <div key={entry.key} className="lore-entry-chip unlocked">
            <span>{entry.icon}</span>
            <div>
              <small>{entry.typeLabel}</small>
              <strong>{entry.title}</strong>
            </div>
          </div>
        ))}
      </div>
      <small className="collection-lore-progress-meta">
        Collection lore: {reveal.unlockedCount}/{reveal.totalCount} ({reveal.storyPct}%)
      </small>
    </div>
  );
}

export function CollectionLoreHub({ state, adventures }) {
  const stories = getAllCollectionStories(state, adventures);

  if (!stories.length) {
    return (
      <div className="card collection-lore-hub">
        <h3>
          <BookOpen size={18} /> Collection Stories
        </h3>
        <p className="admin-meta">Complete adventures to uncover journal pages, maps, and legendary relics.</p>
      </div>
    );
  }

  return (
    <div className="collection-lore-hub">
      <div className="card collection-lore-hub-head">
        <h3>
          <BookOpen size={18} /> Collection Stories
        </h3>
        <p>Journal pages · maps · character histories · secret endings · relics</p>
      </div>
      {stories.map((story) => (
        <CollectionLoreStoryCard key={story.collectionId} story={story} />
      ))}
    </div>
  );
}

function CollectionLoreStoryCard({ story }) {
  const [open, setOpen] = useState(false);
  const { collectionProgress: cp } = story;

  return (
    <div className="card collection-lore-story-card">
      <button type="button" className="collection-lore-story-head" onClick={() => setOpen((v) => !v)}>
        <div>
          <strong>{story.storyTitle}</strong>
          {story.storyIntro && <p>{story.storyIntro}</p>}
        </div>
        <div className="collection-lore-story-stats">
          <span>{story.unlockedCount}/{story.totalCount} lore</span>
          <span>{story.pct}%</span>
        </div>
      </button>

      <div className="progress compact">
        <i style={{ width: `${story.pct}%` }} />
      </div>
      <small className="collection-lore-adventure-meta">
        {cp.found}/{cp.total} adventures · {cp.complete ? 'Collection complete!' : 'Keep hunting'}
      </small>

      {open && (
        <div className="collection-lore-entries">
          {Object.entries(story.grouped).map(([type, entries]) => (
            <div key={type} className="lore-type-group">
              <h5>
                {LORE_TYPE_META[type]?.icon || '📜'} {LORE_TYPE_META[type]?.label || type}
              </h5>
              {entries.map((entry) => (
                <div key={entry.key} className={`lore-entry-row ${entry.unlocked ? 'unlocked' : 'locked'}`}>
                  <span className="lore-entry-icon">{entry.unlocked ? entry.icon : <Lock size={14} />}</span>
                  <div>
                    <b>{entry.unlocked ? entry.title : '???'}</b>
                    <p>{entry.unlocked ? entry.body : entry.lockedHint}</p>
                    {entry.unlocked && entry.sourceAdventureTitle && (
                      <small>{entry.sourceAdventureTitle}</small>
                    )}
                    {entry.unlocked && entry.videoUrl && (
                      <a href={entry.videoUrl} target="_blank" rel="noreferrer" className="lore-video-link">
                        Watch clip
                      </a>
                    )}
                  </div>
                  <span className="lore-entry-status">{entry.unlocked ? <Unlock size={14} /> : null}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DirectorLoreRevealPanel({ adventure, state, progress }) {
  const reveal = getVictoryLoreReveal(state, adventure, progress || {});
  if (!reveal?.entries?.length) return null;

  return (
    <div className="card director-lore-reveal">
      <h4>
        <Globe size={16} /> {reveal.storyTitle || reveal.collectionName} · Story Archive
      </h4>
      <ul className="director-lore-pages">
        {reveal.entries.map((entry) => (
          <li key={entry.key} className={entry.unlocked ? 'unlocked' : 'locked'}>
            <span className="lore-page-num">
              {entry.icon} {entry.typeLabel}
            </span>
            <b>{entry.unlocked ? entry.title : 'Locked'}</b>
            <p>{entry.unlocked ? entry.body : 'Complete this adventure to unlock.'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
