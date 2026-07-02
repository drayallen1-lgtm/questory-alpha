/**
 * Questory 2.0 — Phase 14: AI NPC UI
 * Enhanced living NPC cards with relationship, memory, quest hooks, and story arcs.
 */
import React, { useMemo } from 'react';
import {
  getAiNpcSnapshot,
  generateNpcDialogue,
  generateNpcQuestHook,
  getNpcRelationshipLabel,
  getNpcMemoryRecord,
  mergeNpcWithProfile,
  buildNpcPromptPayload,
  recordNpcChoice,
  recordNpcEncounter,
  RELATIONSHIP_LABELS,
} from './aiNpcEngine';
import { getNpcStoryArcs } from './dynamicStoryEngine';
import { markNpcDialogueSeen } from './worldEngine';
import { getTrustLabel } from './livingNpcEngine';
import { isDev } from './config/env';

export function NpcRelationshipBadge({ relationship, trust }) {
  const label = relationship || getNpcRelationshipLabel(trust ?? 50);
  const tier =
    label === RELATIONSHIP_LABELS.legendary_bond
      ? 'legendary'
      : label === RELATIONSHIP_LABELS.ally || label === RELATIONSHIP_LABELS.mentor
        ? 'ally'
        : label === RELATIONSHIP_LABELS.wary || label === RELATIONSHIP_LABELS.haunted
          ? 'wary'
          : 'neutral';

  return (
    <span className={`ai-npc-relationship-badge tier-${tier}`} title={`Trust ${trust ?? '—'}`}>
      {label}
    </span>
  );
}

export function NpcMemoryPanel({ memory, compact = false }) {
  if (!memory) return null;
  const flags = memory.memoryFlags || [];
  if (!flags.length && !memory.lastSeen) return null;

  return (
    <div className={`ai-npc-memory-panel ${compact ? 'compact' : ''}`}>
      <small className="ai-npc-memory-label">Memory</small>
      {memory.lastSeen && (
        <p className="ai-npc-memory-seen">Last seen {new Date(memory.lastSeen).toLocaleDateString()}</p>
      )}
      {flags.length > 0 && (
        <ul className="ai-npc-memory-flags">
          {flags.slice(-3).map((flag) => (
            <li key={flag}>{flag.replace(/_/g, ' ')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NpcQuestOfferCard({ questHook, onAccept }) {
  if (!questHook) return null;
  return (
    <div className="ai-npc-quest-offer card">
      <small>Quest offer</small>
      <p>{questHook.label}</p>
      {questHook.reward && (
        <div className="ai-npc-quest-rewards">
          {questHook.reward.xp && <span>+{questHook.reward.xp} XP</span>}
          {questHook.reward.coins && <span>+{questHook.reward.coins} coins</span>}
          {questHook.reward.trust && <span>+{questHook.reward.trust} trust</span>}
        </div>
      )}
      {onAccept && (
        <button type="button" className="ghost small" onClick={() => onAccept(questHook)}>
          Accept hook
        </button>
      )}
    </div>
  );
}

export function NpcStoryArcPanel({ arcs }) {
  if (!arcs?.length) return null;
  const active = arcs.find((a) => a.status === 'In Progress' || a.status === 'Available') || arcs[0];
  if (!active) return null;

  return (
    <div className="ai-npc-story-arc-panel">
      <small>Story arc</small>
      <strong>{active.title}</strong>
      <span className="ai-npc-arc-status">{active.status}</span>
      {active.chapter && <p>{active.chapter.title}</p>}
      <div className="progress compact ai-npc-arc-bar">
        <i style={{ width: `${active.pct || 0}%` }} />
      </div>
    </div>
  );
}

export function NpcDialogueChoiceList({ choices, onChoice }) {
  if (!choices?.length) return null;
  return (
    <div className="npc-choice-list ai-npc-choice-list">
      {choices.map((choice) => (
        <button key={choice.id} type="button" className="npc-choice-btn" onClick={() => onChoice(choice)}>
          {choice.label}
        </button>
      ))}
    </div>
  );
}

export function NpcPromptPreviewPanel({ payload }) {
  if (!isDev || !payload) return null;
  return (
    <details className="ai-npc-prompt-preview dev-only">
      <summary>AI prompt payload (dev)</summary>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </details>
  );
}

export function AiNpcCard({
  presentation,
  adventure,
  state,
  setState,
  progress,
  adventures = [],
}) {
  if (!presentation) return null;

  const { npc, dialogueId, text, mood, moodLabel, greeting, memoryLine, choices, seen, trust } =
    presentation;

  const merged = useMemo(() => mergeNpcWithProfile(npc), [npc]);
  const memory = useMemo(() => getNpcMemoryRecord(state, merged?.id || npc.id), [state, merged, npc.id]);
  const dynamicDialogue = useMemo(
    () => generateNpcDialogue(merged || npc, state, adventures, { baseText: text, adventure, progress }),
    [merged, npc, state, adventures, text, adventure, progress]
  );
  const questHook = useMemo(
    () => generateNpcQuestHook(merged || npc, state, adventures, { adventure }),
    [merged, npc, state, adventures, adventure]
  );
  const storyArcs = useMemo(
    () => getNpcStoryArcs(state, merged?.id || npc.id, adventures),
    [state, merged, npc.id, adventures]
  );
  const relationship = getNpcRelationshipLabel(memory);
  const promptPayload = useMemo(
    () =>
      buildNpcPromptPayload({
        npc: merged || npc,
        player: {
          level: state?.playerProgression?.lastLevelSeen || 1,
          completedAdventures: Object.keys(state?.progress || {}).length,
        },
        world: dynamicDialogue.context,
        adventure,
        history: memory,
      }),
    [merged, npc, state, adventure, memory, dynamicDialogue.context]
  );

  function handleChoice(choice) {
    setState((s) => recordNpcChoice(s, npc.id, dialogueId, choice, adventure?.id, progress));
  }

  function handleContinue() {
    setState((s) => {
      let next = markNpcDialogueSeen(s, npc.id, dialogueId, adventure?.id);
      return recordNpcEncounter(next, npc.id, {
        adventureId: adventure?.id,
        dialogueId,
        location: adventure?.location,
      });
    });
  }

  const displayText = dynamicDialogue.text || text;
  const displayMood = dynamicDialogue.mood || mood;

  return (
    <div className={`card npc-play-card living-npc-card ai-npc-card mood-${displayMood}`}>
      <span className="npc-avatar">{npc.avatar}</span>
      <div className="living-npc-body">
        <div className="living-npc-head">
          <b>{npc.name}</b>
          {npc.role && <small className="npc-role">{npc.role}</small>}
          <span className={`npc-mood-badge mood-${displayMood}`}>{moodLabel}</span>
          <NpcRelationshipBadge relationship={relationship} trust={memory.trust ?? trust} />
          <span className="npc-trust-badge">{getTrustLabel(memory.trust ?? trust)}</span>
        </div>
        <div className="ai-npc-trust-meter" aria-label="Trust meter">
          <i style={{ width: `${memory.trust ?? trust ?? 50}%` }} />
        </div>
        {greeting && <p className="npc-return-greeting">{greeting}</p>}
        {memoryLine && <p className="npc-memory-callback">{memoryLine}</p>}
        <NpcMemoryPanel memory={memory} compact />
        <blockquote className="npc-dialogue-line">&ldquo;{displayText}&rdquo;</blockquote>
        <NpcQuestOfferCard questHook={questHook} />
        <NpcStoryArcPanel arcs={storyArcs} />
        <NpcDialogueChoiceList choices={choices} onChoice={handleChoice} />
        {!seen && !choices?.length && (
          <button type="button" className="ghost" onClick={handleContinue}>
            Continue
          </button>
        )}
        <NpcPromptPreviewPanel payload={promptPayload} />
      </div>
    </div>
  );
}

/** Drop-in replacement for LivingNpcCard — preserves existing props contract. */
export function EnhancedLivingNpcCard(props) {
  return <AiNpcCard {...props} adventures={props.adventures || []} />;
}

export function AiNpcPassportPanel({ state, adventures = [] }) {
  const snapshot = useMemo(() => getAiNpcSnapshot(state, adventures), [state, adventures]);
  const met = snapshot.profiles.filter((p) => p.met);

  if (!met.length) {
    return (
      <div className="card ai-npc-passport-empty">
        <p>Meet living NPCs on adventures to build memory and story arcs.</p>
      </div>
    );
  }

  return (
    <div className="ai-npc-passport-panel">
      <h4>Living NPCs</h4>
      <div className="ai-npc-passport-grid">
        {met.slice(0, 8).map((profile) => (
          <div key={profile.id} className="ai-npc-passport-chip">
            <span>{profile.avatar}</span>
            <div>
              <strong>{profile.name}</strong>
              <NpcRelationshipBadge relationship={profile.relationship} trust={profile.trust} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
