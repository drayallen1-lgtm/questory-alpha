import React from 'react';
import { Clock, Flame, Map, Radio, Sparkles, Swords, Users, Zap } from 'lucide-react';
import { getLiveRaceEvents } from './socialWorldEngine';
import { getSeasonMapBadge, getWorldBossTeaser } from './seasonEngine';

function timelineIcon(kind) {
  switch (kind) {
    case 'heat':
      return <Flame size={14} />;
    case 'team':
      return <Users size={14} />;
    case 'territory':
      return <Map size={14} />;
    case 'guild':
      return <Users size={14} />;
    case 'race':
      return <Zap size={14} />;
    case 'event':
      return <Radio size={14} />;
    case 'sponsor':
      return <Sparkles size={14} />;
    case 'completion':
      return <Swords size={14} />;
    default:
      return <Clock size={14} />;
  }
}

function formatTimeAgo(minutesAgo) {
  if (minutesAgo >= 60 * 24) return 'Yesterday';
  if (minutesAgo >= 60) return `${Math.floor(minutesAgo / 60)} hr ago`;
  if (minutesAgo <= 1) return 'Just now';
  return `${minutesAgo} min ago`;
}

export function LivingWorldTimeline({ entries = [], races = null, showRaces = true, showBossTeaser = true }) {
  const season = getSeasonMapBadge();
  const boss = getWorldBossTeaser();
  const raceRows = races ?? (showRaces ? getLiveRaceEvents() : []);

  if (!entries.length && !raceRows.length) return null;

  return (
    <div className="card living-world-timeline">
      <div className="living-world-timeline-head">
        <h4>World Activity</h4>
        <span className="living-world-season-badge" title={season.title}>
          {season.icon} {season.label}
        </span>
      </div>

      {showBossTeaser && boss.status === 'teaser' && (
        <div className="living-world-boss-teaser">
          <strong>{boss.title}</strong>
          <p>{boss.description}</p>
          <span className="living-world-boss-reward">{boss.rewardLabel} · limited time</span>
        </div>
      )}

      {raceRows.map((race) => (
        <div key={race.id} className="living-world-race-row">
          <Zap size={14} />
          <span>
            <b>{race.title}</b> — {race.explorersRacing || race.teamsCompeting} racing to{' '}
            {race.adventureTitle} · {race.countdownMinutes}m left
          </span>
        </div>
      ))}

      <ul className="living-world-timeline-list">
        {entries.map((entry) => (
          <li key={entry.id} className={`living-world-timeline-item kind-${entry.kind}`}>
            <span className="living-world-timeline-icon">{timelineIcon(entry.kind)}</span>
            <span className="living-world-timeline-text">{entry.text}</span>
            <span className="living-world-timeline-time">{formatTimeAgo(entry.minutesAgo)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
