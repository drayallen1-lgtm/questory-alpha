import React from 'react';

function CityCompletionRing({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="questory-city-ring" style={{ '--city-pct': clamped }} aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <path
          className="questory-city-ring-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="questory-city-ring-fill"
          strokeDasharray={`${clamped}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="questory-city-ring-label">{clamped}%</span>
    </div>
  );
}

export function QuestoryIdentityPanel({ identity, onNavigateLeaderboard }) {
  if (!identity) return null;

  const { season, boss, cityPct, cityLabel, hallOfFame, creatorWorlds, communityEvents, sponsoredCampaigns } =
    identity;

  return (
    <div className="card questory-identity-panel">
      <div className="questory-identity-head">
        <div>
          <h4>Questory Universe</h4>
          <p className="questory-identity-season">
            {season.badgeIcon} {season.title}
          </p>
        </div>
        <CityCompletionRing pct={cityPct} />
      </div>

      <p className="questory-identity-city-line">
        <strong>{cityLabel}</strong> is <strong>{cityPct}%</strong> explored by the community
      </p>

      {boss?.status === 'active' && (
        <div className="questory-identity-boss-card">
          <div className="questory-identity-boss-head">
            <span aria-hidden="true">🏮</span>
            <strong>{boss.title}</strong>
            <span className="questory-identity-boss-timer">{boss.hoursRemaining}h left</span>
          </div>
          <p>{boss.description}</p>
          <div className="questory-identity-boss-meta">
            <span>{boss.participantsEstimate} explorers</span>
            <span>{boss.communityProgress}% community progress</span>
            <span>{boss.rewardLabel}</span>
          </div>
        </div>
      )}

      {communityEvents.slice(0, 1).map((event) => (
        <div key={event.id} className="questory-identity-community-row">
          <span aria-hidden="true">{event.icon}</span>
          <span>
            <strong>{event.title}</strong> — {event.description}
          </span>
        </div>
      ))}

      {sponsoredCampaigns.length > 0 && (
        <div className="questory-identity-sponsored-row">
          {sponsoredCampaigns.slice(0, 2).map((c) => (
            <span key={c.id} className="questory-identity-sponsored-chip">
              {c.icon} {c.sponsorName}
            </span>
          ))}
        </div>
      )}

      <div className="questory-identity-creator-worlds">
        <h5>Creator Worlds</h5>
        <div className="questory-identity-creator-scroll">
          {creatorWorlds.map((world) => (
            <div key={world.creatorWorldId} className="questory-identity-creator-card">
              <strong>{world.worldTitle}</strong>
              <span>{world.creatorName}</span>
              <span className="questory-identity-creator-pct">{world.progressPct}% complete</span>
            </div>
          ))}
        </div>
      </div>

      <div className="questory-identity-hof">
        <div className="questory-identity-hof-head">
          <h5>Hall of Fame</h5>
          {onNavigateLeaderboard && (
            <button type="button" className="ghost questory-identity-hof-link" onClick={onNavigateLeaderboard}>
              View all
            </button>
          )}
        </div>
        <ul className="questory-identity-hof-list">
          {hallOfFame.slice(0, 3).map((explorer) => (
            <li key={explorer.id} className={explorer.isYou ? 'is-you' : ''}>
              <span className="questory-identity-hof-rank">#{explorer.rank}</span>
              <span className="questory-identity-hof-icon" aria-hidden="true">
                {explorer.icon}
              </span>
              <span className="questory-identity-hof-name">
                {explorer.name}
                {explorer.isYou ? ' (you)' : ''}
              </span>
              <span className="questory-identity-hof-title">{explorer.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
