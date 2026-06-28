import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Globe,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { getPublishedAdventures } from './seed';
import { getCreatorForAdventure } from './economy';
import {
  applyWorldEventToAdventure,
  formatEventCountdown,
  getForcedWorldEventId,
  getParticipatingAdventures,
  getPendingWorldNotifications,
  markWorldNotificationSeen,
  safeApplyWorldEventToAdventure,
  safeGetWorldEventContext,
  setForcedWorldEventId,
  WORLD_EVENTS,
} from './worldEventEngine';
import { joinCityEvent } from './worldEngine';

export function WorldEventNotificationBar({ state, setState, adventures }) {
  const context = safeGetWorldEventContext(state, adventures);
  const notes = getPendingWorldNotifications(state, context);
  if (!notes.length) return null;

  const note = notes[0];
  return (
    <div className="card world-event-notification-bar">
      <Bell size={16} />
      <div>
        <b>{note.title}</b>
        <p>{note.body}</p>
      </div>
      <button
        type="button"
        className="ghost"
        onClick={() => setState((s) => markWorldNotificationSeen(s, note.id))}
      >
        Got it
      </button>
    </div>
  );
}

export function TodaysWorldPanel({ state, adventures, nav, setState }) {
  const context = safeGetWorldEventContext(state, adventures);
  const published = getPublishedAdventures(adventures);
  const primary = context.primaryEvent;
  const newAdventures = published
    .filter((a) => (a.playersCompleted || 0) < 5)
    .slice(0, 3);
  const endingSoon = context.endingSoon?.[0];

  return (
    <section className="card todays-world-panel">
      <div className="todays-world-head">
        <h3>
          <Globe size={18} /> Today&apos;s World
        </h3>
        {primary && (
          <span className="world-event-live-pill">
            <span className="live-dot" /> Live
          </span>
        )}
      </div>

      {primary ? (
        <div className="todays-world-primary">
          <span className="todays-world-icon">{primary.icon}</span>
          <div>
            <strong>{primary.title}</strong>
            <p>{primary.banner}</p>
            <small>
              <Clock size={12} /> {formatEventCountdown(context.endingSoon?.[0]?.endDate || new Date(Date.now() + 86400000), context.now)}
            </small>
          </div>
        </div>
      ) : (
        <p className="admin-meta">The world is calm today — check back for the next event.</p>
      )}

      <div className="todays-world-grid">
        {endingSoon && (
          <div className="todays-world-tile ending-soon">
            <Flame size={16} />
            <div>
              <small>Ending Soon</small>
              <strong>{endingSoon.title}</strong>
              <span>{endingSoon.countdown}</span>
            </div>
          </div>
        )}

        {context.upcoming?.[0] && (
          <div className="todays-world-tile">
            <Calendar size={16} />
            <div>
              <small>Upcoming</small>
              <strong>{context.upcoming[0].title}</strong>
              <span>in {context.upcoming[0].startsInDays}d</span>
            </div>
          </div>
        )}

        {newAdventures.length > 0 && (
          <div className="todays-world-tile">
            <Sparkles size={16} />
            <div>
              <small>New Adventures</small>
              <strong>{newAdventures[0].title}</strong>
              <span>{newAdventures.length} fresh hunts</span>
            </div>
          </div>
        )}

        <div className="todays-world-tile">
          <Users size={16} />
          <div>
            <small>Community Activity</small>
            <strong>{context.communityMilestones?.filter((m) => m.reached).length || 0} milestones</strong>
            <span>{context.participatingCount} event hunts</span>
          </div>
        </div>

        {context.featuredCreator && (
          <div className="todays-world-tile">
            <Trophy size={16} />
            <div>
              <small>Featured Creator</small>
              <strong>{context.featuredCreator.adventureTitle}</strong>
            </div>
          </div>
        )}

        {context.featuredSponsor && (
          <div className="todays-world-tile">
            <Sparkles size={16} />
            <div>
              <small>Featured Sponsor</small>
              <strong>{context.featuredSponsor.name}</strong>
            </div>
          </div>
        )}
      </div>

      {context.limitedRelicsAvailable?.length > 0 && (
        <div className="todays-world-relics">
          <small>Limited relics available</small>
          <div className="relic-chip-row">
            {context.limitedRelicsAvailable.map((relic) => (
              <span key={relic.id} className="relic-chip">
                {relic.icon} {relic.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="todays-world-actions">
        <button type="button" className="ghost" onClick={() => nav('world')}>
          Live Events <ChevronRight size={14} />
        </button>
        {import.meta.env.DEV && (
          <button
            type="button"
            className="ghost dev-unlock"
            onClick={() => {
              const forced = getForcedWorldEventId();
              setForcedWorldEventId(forced === 'halloween' ? null : 'halloween');
              window.location.reload();
            }}
          >
            {getForcedWorldEventId() === 'halloween' ? 'Clear Halloween demo' : 'Demo: Halloween'}
          </button>
        )}
      </div>
    </section>
  );
}

export function LiveWorldEventBanner({ context }) {
  if (!context?.primaryEvent) return null;
  const event = context.primaryEvent;
  return (
    <div className={`card live-world-event-banner atmosphere-${context.modifiers?.atmosphere || 'default'}`}>
      <span className="live-event-icon">{event.icon}</span>
      <div>
        <strong>{event.title}</strong>
        <p>{event.banner}</p>
      </div>
    </div>
  );
}

export function WorldEventAtmosphereOverlay({ context }) {
  if (!context?.modifiers) return null;
  const { atmosphere, particles = [], darkerAtmosphere, goldenHour } = context.modifiers;
  if (!atmosphere && !particles.length) return null;

  return (
    <div
      className={`world-event-atmosphere atmosphere-${atmosphere || 'default'} ${darkerAtmosphere ? 'darker' : ''} ${goldenHour ? 'golden-hour' : ''}`}
      aria-hidden="true"
    >
      {particles.includes('fog') && <div className="event-particle-layer fog-layer" />}
      {particles.includes('snow') && <div className="event-particle-layer snow-layer" />}
      {particles.includes('pumpkin') && <div className="event-particle-layer pumpkin-layer" />}
      {particles.includes('spark') && <div className="event-particle-layer spark-layer" />}
    </div>
  );
}

export function LiveEventDashboard({ state, setState, adventures }) {
  const context = safeGetWorldEventContext(state, adventures);
  const participating = getParticipatingAdventures(adventures, context);
  const earnedRelics = state?.world?.eventRelicsEarned || [];
  const completions = state?.world?.eventCompletions || {};

  return (
    <div className="live-event-dashboard">
      <LiveWorldEventBanner context={context} />

      <div className="card">
        <h3>
          <Flame size={18} /> Live Events
        </h3>
        {context.activeEvents.length === 0 && (
          <p className="admin-meta">No world events active right now.</p>
        )}
        {context.activeEvents.map((event) => (
          <div key={event.id} className="live-event-row">
            <span>{event.icon}</span>
            <div>
              <b>{event.title}</b>
              <p>{event.description}</p>
              <small>{formatEventCountdown(context.endingSoon.find((e) => e.id === event.id)?.endDate || new Date(Date.now() + 86400000), context.now)}</small>
            </div>
            {context.modifiers?.coinMultiplier > 1 && (
              <span className="event-bonus-pill">×{context.modifiers.coinMultiplier} coins</span>
            )}
          </div>
        ))}
      </div>

      {context.upcoming.length > 0 && (
        <div className="card">
          <h3>
            <Calendar size={18} /> Upcoming Events
          </h3>
          {context.upcoming.map((event) => (
            <div key={event.id} className="upcoming-event-row">
              <span>{event.icon}</span>
              <div>
                <b>{event.title}</b>
                <p>Starts in {event.startsInDays} day{event.startsInDays !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>
          <Trophy size={18} /> Limited Rewards
        </h3>
        {context.limitedRelicsAvailable.length === 0 && earnedRelics.length === 0 && (
          <p className="admin-meta">Complete an event hunt to earn limited relics.</p>
        )}
        {context.limitedRelicsAvailable.map((relic) => (
          <div key={relic.id} className="limited-relic-row available">
            <span>{relic.icon}</span>
            <div>
              <b>{relic.name}</b>
              <p>{relic.desc}</p>
            </div>
            <small>Available now</small>
          </div>
        ))}
        {earnedRelics.map((relicId) => (
          <div key={relicId} className="limited-relic-row earned">
            <span>✅</span>
            <div>
              <b>{relicId.replace(/-/g, ' ')}</b>
              <p>Secured in your Passport</p>
            </div>
          </div>
        ))}
      </div>

      {participating.length > 0 && (
        <div className="card">
          <h3>
            <Globe size={18} /> Participating Adventures
          </h3>
          {participating.slice(0, 6).map((adv) => {
            const advEvent = safeApplyWorldEventToAdventure(adv, context);
            const creator = getCreatorForAdventure(adv);
            return (
              <div key={adv.id} className="participating-adventure-row">
                <div>
                  <b>{advEvent.title}</b>
                  <small>{creator?.displayName || adv.sponsor || 'Questory'}</small>
                </div>
                {advEvent._worldEvent?.primaryEventIcon && (
                  <span>{advEvent._worldEvent.primaryEventIcon}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(completions).length > 0 && (
        <div className="card">
          <h3>Completed Events</h3>
          {Object.entries(completions).map(([key, record]) => (
            <div key={key} className="completed-event-row">
              <b>{record.eventTitle}</b>
              <small>{new Date(record.completedAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}

      {context.communityMilestones?.length > 0 && (
        <div className="card">
          <h3>
            <Users size={18} /> Community Milestones
          </h3>
          {context.communityMilestones.map((m) => (
            <div key={m.id} className={`community-milestone-row ${m.reached ? 'reached' : ''}`}>
              <span>{m.icon}</span>
              <div>
                <b>{m.title}</b>
                <p>{m.body}</p>
                <small>{m.current} / {m.threshold}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card world-event-catalog">
        <h3>All Supported Events</h3>
        <div className="event-type-grid">
          {WORLD_EVENTS.map((event) => (
            <span key={event.id} className="event-type-chip" title={event.description}>
              {event.icon} {event.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActiveWorldEventBadge({ adventure, context }) {
  const event = adventure?._worldEvent;
  if (!event?.primaryEventTitle) return null;
  return (
    <span className="badge world-event-active-badge">
      {event.primaryEventIcon} {event.primaryEventTitle}
    </span>
  );
}
