import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Footprints,
  MapPin,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Video,
  Wand2,
} from 'lucide-react';
import { formatUserErrorMessage } from './claimSystem';
import {
  ADVENTURE_SCALES,
  CLUE_TYPE_LABELS,
  CLUE_TYPES,
  DURATION_PRESETS,
  ENVIRONMENT_OPTIONS,
  PLAYER_COUNTS,
  SCALE_PRESETS,
  TEMPLATE_META,
  applySmartBuilderConfig,
  buildTemplateClues,
  buildTemplateRewards,
  buildTemplateStory,
} from './templates';
import {
  computeAdaptiveSuggestions,
  computeCreatorAnalytics,
  finishVerificationRun,
  formatScaleLabel,
  getDynamicHintForClue,
  getToolkitOptions,
  getVictoryMessage,
  isCreatorVerified,
  normalizeExperienceSettings,
  startVerificationRun,
  completeVerificationCheckpoint,
} from './experience';
import { generateAdventureFromPrompt, getAssistantSuggestions, refineAssistantDraft } from './adventureAssistant';

export function TemplatePicker({ selected, onSelect }) {
  return (
    <div className="card experience-template-picker">
      <h3>Choose a Quest Type</h3>
      <div className="template-grid">
        {Object.values(TEMPLATE_META).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`card mini template-card template-theme-${t.id} ${selected === t.id ? 'active' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <span className="template-icon">{t.icon}</span>
            <b>{t.label}</b>
            <small>{t.desc}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScaleSelector({ value, onChange }) {
  return (
    <div className="card scale-selector">
      <h3>Adventure Scale</h3>
      <div className="scale-options">
        {Object.values(SCALE_PRESETS).map((scale) => (
          <label key={scale.id} className={`scale-option ${value === scale.id ? 'active' : ''}`}>
            <input
              type="radio"
              name="adventure-scale"
              value={scale.id}
              checked={value === scale.id}
              onChange={() => onChange(scale.id)}
            />
            <b>{scale.label}</b>
            <small>{scale.desc}</small>
            <span className="scale-meta">
              {scale.id === 'backyard'
                ? 'Search 15–50 ft · Capture 3–10 ft · 5–20 min'
                : scale.id === 'neighborhood'
                  ? '25–100 m · 20–45 min'
                  : scale.id === 'city'
                    ? '100–500 m · 30–120 min'
                    : scale.id === 'regional'
                      ? 'Road trips · state parks'
                      : 'Custom settings'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function SmartBuilderPanel({ templateId, scaleId, onApply }) {
  const [players, setPlayers] = useState('3-5');
  const [duration, setDuration] = useState('15');
  const [environment, setEnvironment] = useState('outdoor');

  function apply() {
    onApply(
      applySmartBuilderConfig({
        templateId,
        scaleId,
        players,
        durationMin: duration,
        environment,
      })
    );
  }

  return (
    <div className="card smart-builder-panel">
      <h3>
        <Sparkles size={18} /> Smart Adventure Builder
      </h3>
      <label>How many players?</label>
      <div className="chip-row">
        {PLAYER_COUNTS.map((p) => (
          <button key={p} type="button" className={players === p ? 'active' : ''} onClick={() => setPlayers(p)}>
            {p}
          </button>
        ))}
      </div>
      <label>How long should this take?</label>
      <div className="chip-row">
        {[
          ['5', '5 min'],
          ['15', '15 min'],
          ['30', '30 min'],
          ['60', '1 hour'],
          ['120', '2+ hours'],
        ].map(([val, label]) => (
          <button key={val} type="button" className={duration === val ? 'active' : ''} onClick={() => setDuration(val)}>
            {label}
          </button>
        ))}
      </div>
      <label>Indoor, Outdoor, or Both?</label>
      <div className="chip-row">
        {ENVIRONMENT_OPTIONS.map((e) => (
          <button key={e} type="button" className={environment === e ? 'active' : ''} onClick={() => setEnvironment(e)}>
            {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>
      <button type="button" onClick={apply}>
        Auto-configure adventure
      </button>
    </div>
  );
}

export function ToolkitPanel({ toolkit, settings, onChange }) {
  const options = getToolkitOptions(toolkit);
  if (!toolkit || !options.features) return null;

  return (
    <div className="card toolkit-panel">
      <h3>{toolkit.charAt(0).toUpperCase() + toolkit.slice(1)} Toolkit</h3>
      {toolkit === 'horror' && (
        <>
          <label>Atmosphere</label>
          <select value={settings.atmosphere || 'mild'} onChange={(e) => onChange({ atmosphere: e.target.value })}>
            <option value="mild">Mild</option>
            <option value="creepy">Creepy</option>
            <option value="terrifying">Terrifying</option>
          </select>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(settings.jumpMoments)}
              onChange={(e) => onChange({ jumpMoments: e.target.checked })}
            />
            Jump moments & story cards
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(settings.arHorror)}
              onChange={(e) => onChange({ arHorror: e.target.checked })}
            />
            AR Horror (ghost children, shadow figures, lanterns)
          </label>
        </>
      )}
      {toolkit === 'family' && (
        <p className="admin-meta">Simple clues · larger capture areas · sticker badges · cartoon medallions</p>
      )}
      {toolkit === 'church' && (
        <p className="admin-meta">Scripture unlocks · youth events · Easter & Nativity walks</p>
      )}
      {toolkit === 'school' && (
        <p className="admin-meta">History hunts · science trails · math challenges · field trips</p>
      )}
      {toolkit === 'date_night' && (
        <p className="admin-meta">Memory questions · hidden messages · couple badges & certificates</p>
      )}
    </div>
  );
}

export function QuestoryAssistant({ onApplyDraft }) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState(null);
  const [refine, setRefine] = useState('');

  function handleGenerate() {
    const result = generateAdventureFromPrompt(prompt);
    setDraft(result);
  }

  function handleRefine() {
    if (!draft?.ok || !refine.trim()) return;
    setDraft(refineAssistantDraft(draft, refine));
    setRefine('');
  }

  return (
    <div className="card questory-assistant">
      <h3>
        <Wand2 size={18} /> Questory Assistant
      </h3>
      <p className="admin-meta">Describe your adventure — Questory generates story, clues, and rewards.</p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='e.g. "Help me create a scary backyard hunt for my kids"'
        rows={3}
      />
      <div className="assistant-suggestions">
        {getAssistantSuggestions().map((s) => (
          <button key={s} type="button" className="ghost" onClick={() => setPrompt(s)}>
            {s}
          </button>
        ))}
      </div>
      <button type="button" onClick={handleGenerate}>
        Generate adventure
      </button>
      {draft?.ok && (
        <div className="assistant-draft">
          <p>{draft.summary}</p>
          <p>
            <b>{draft.meta.title}</b> · {draft.clues.length} clues · {draft.meta.estimatedMinutes} min
          </p>
          <input value={refine} onChange={(e) => setRefine(e.target.value)} placeholder="Refine: make it scarier..." />
          <div className="assistant-actions">
            <button type="button" className="ghost" onClick={handleRefine}>
              Refine
            </button>
            <button type="button" onClick={() => onApplyDraft(draft)}>
              Apply to form
            </button>
          </div>
        </div>
      )}
      {draft && !draft.ok && <p className="form-error">{formatUserErrorMessage(draft)}</p>}
    </div>
  );
}

export function ClueTypeFields({ clue, onChange }) {
  return (
    <>
      <label>Clue type</label>
      <select value={clue.clueType || CLUE_TYPES.TEXT_RIDDLE} onChange={(e) => onChange({ clueType: e.target.value })}>
        {Object.entries(CLUE_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {clue.clueType === CLUE_TYPES.MULTIPLE_CHOICE && (
        <>
          <label>Choices (comma-separated)</label>
          <input
            value={(clue.choices || []).join(', ')}
            onChange={(e) =>
              onChange({ choices: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
            }
            placeholder="Option A, Option B, Option C"
          />
        </>
      )}
      {clue.clueType === CLUE_TYPES.AUDIO && (
        <>
          <label>Audio URL or note</label>
          <input
            value={clue.audioUrl || ''}
            onChange={(e) => onChange({ audioUrl: e.target.value })}
            placeholder="https://... or paste recording URL"
          />
        </>
      )}
      {clue.clueType === CLUE_TYPES.VIDEO && (
        <>
          <label>Video URL</label>
          <input
            value={clue.videoUrl || ''}
            onChange={(e) => onChange({ videoUrl: e.target.value })}
            placeholder="https://..."
          />
        </>
      )}
      {clue.clueType === CLUE_TYPES.IMAGE_PUZZLE && (
        <>
          <label>Image URL</label>
          <input
            value={clue.imageUrl || ''}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </>
      )}
    </>
  );
}

export function CluePlayContent({ clue, onAnswer }) {
  const [answer, setAnswer] = useState('');
  const type = clue.clueType || CLUE_TYPES.TEXT_RIDDLE;

  if (type === CLUE_TYPES.AUDIO) {
    return (
      <div className="clue-media audio-clue">
        <Mic size={20} />
        <p>{clue.text}</p>
        {clue.audioUrl ? (
          <audio controls src={clue.audioUrl} className="clue-audio-player">
            <track kind="captions" />
          </audio>
        ) : (
          <p className="admin-meta">Audio: "{clue.text}" (demo — add URL in Create)</p>
        )}
      </div>
    );
  }

  if (type === CLUE_TYPES.VIDEO) {
    return (
      <div className="clue-media video-clue">
        <Video size={20} />
        {clue.videoUrl ? (
          <video controls src={clue.videoUrl} className="clue-video-player" />
        ) : (
          <p className="admin-meta">Video introduction (demo — add URL in Create)</p>
        )}
        <p>{clue.text}</p>
      </div>
    );
  }

  if (type === CLUE_TYPES.IMAGE_PUZZLE && clue.imageUrl) {
    return (
      <div className="clue-media image-clue">
        <img src={clue.imageUrl} alt="Clue puzzle" className="clue-puzzle-img" />
        <p>{clue.text}</p>
      </div>
    );
  }

  if (type === CLUE_TYPES.MULTIPLE_CHOICE && clue.choices?.length) {
    return (
      <div className="clue-multiple-choice">
        <p>{clue.text}</p>
        {clue.choices.map((choice) => (
          <button key={choice} type="button" className="ghost mc-choice" onClick={() => onAnswer?.(choice)}>
            {choice}
          </button>
        ))}
      </div>
    );
  }

  return <p>{clue.text}</p>;
}

export function DynamicHintPanel({ clueStartMs, adventure, onAcceptHint, onSpendCoins }) {
  const enabled = adventure.experienceSettings?.dynamicHintsEnabled !== false;
  const tier = getDynamicHintForClue(clueStartMs, enabled);
  if (!tier) return null;

  return (
    <div className="card dynamic-hint-panel">
      <p>
        <Footprints size={14} /> {tier.label}
      </p>
      {tier.type === 'full' ? (
        <button type="button" className="ghost" onClick={() => onSpendCoins?.()}>
          Spend {tier.coinCost} coins for full hint
        </button>
      ) : (
        <button type="button" className="ghost" onClick={() => onAcceptHint?.(tier.text)}>
          Show hint
        </button>
      )}
    </div>
  );
}

export function AdventureHealthDashboard({ adventure, state }) {
  const analytics = computeCreatorAnalytics(adventure, state);
  const suggestions = computeAdaptiveSuggestions({ ...adventure, creatorAnalytics: analytics });

  return (
    <div className="card adventure-health-dashboard">
      <h3>
        <Activity size={18} /> Adventure Health
      </h3>
      <div className="health-metrics">
        <div className="metric">
          <small>Completion rate</small>
          <strong>{Math.round(analytics.completionRate * 100)}%</strong>
        </div>
        <div className="metric">
          <small>Avg time</small>
          <strong>{Math.round(analytics.avgCompletionMinutes)}m</strong>
        </div>
        <div className="metric">
          <small>Hint usage</small>
          <strong>{Math.round(analytics.hintUsageRate * 100)}%</strong>
        </div>
        <div className="metric">
          <small>Heat</small>
          <strong>{analytics.heatScore || adventure.heatScore || 0}°</strong>
        </div>
        <div className="metric">
          <small>Rating</small>
          <strong>{analytics.avgRating || '—'}</strong>
        </div>
        <div className="metric">
          <small>Redemptions</small>
          <strong>{Math.round(analytics.rewardRedemptionRate * 100)}%</strong>
        </div>
      </div>
      {suggestions.length > 0 && (
        <>
          <h4>Adaptive suggestions</h4>
          {suggestions.map((s) => (
            <p key={s.id} className="adaptive-suggestion">
              {s.message}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

export function VerificationModePanel({ adventure, state, setState, clueIndex }) {
  const verified = isCreatorVerified(adventure);
  const run = state.experience?.verificationRuns?.find(
    (r) => r.adventureId === adventure.id && r.status === 'in_progress'
  );

  return (
    <div className="card verification-panel">
      <h3>
        <ShieldCheck size={18} /> Verification Mode
      </h3>
      {verified ? (
        <p className="verified-badge-inline">
          <CheckCircle2 size={16} /> Creator Verified
        </p>
      ) : run ? (
        <>
          <p>Walk the route — confirm clue {clueIndex + 1} is reachable.</p>
          <button
            type="button"
            onClick={() =>
              setState((s) => completeVerificationCheckpoint(s, adventure.id, clueIndex, true))
            }
          >
            <MapPin size={14} /> Mark reachable
          </button>
          <button type="button" className="ghost" onClick={() => setState((s) => finishVerificationRun(s, adventure.id))}>
            Finish verification
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setState((s) => startVerificationRun(s, adventure.id))}>
          Start verification walk
        </button>
      )}
    </div>
  );
}

export function CreatorVerifiedBadge({ adventure }) {
  if (!isCreatorVerified(adventure)) return null;
  return (
    <span className="creator-verified-badge">
      <CheckCircle2 size={12} /> Creator Verified
    </span>
  );
}

export function BackyardPrecisionBanner({ adventure }) {
  const settings = normalizeExperienceSettings(adventure.experienceSettings);
  if (!settings.backyardPrecision && adventure.adventureScale !== ADVENTURE_SCALES.BACKYARD) return null;
  return (
    <div className="preview-banner backyard-precision-banner">
      <MapPin size={14} /> Backyard Precision · Search 10–20 ft · Capture 3–5 ft
    </div>
  );
}

export function ExperienceVictoryMessage({ adventure }) {
  const msg = getVictoryMessage(adventure);
  if (!msg) return null;
  return <p className="experience-victory-message">{msg}</p>;
}

export function HorrorAtmosphereOverlay({ adventure }) {
  const atm = adventure.experienceSettings?.atmosphere;
  if (!atm || atm === 'mild') return null;
  return (
    <div className={`horror-atmosphere ${atm}`} aria-hidden="true">
      {atm === 'terrifying' && <span className="horror-fog" />}
    </div>
  );
}

export function ApplyTemplateButton({ templateId, scaleId, onApply }) {
  return (
    <button
      type="button"
      className="ghost"
      onClick={() => {
        const config = applySmartBuilderConfig({ templateId, scaleId, players: '3-5', durationMin: '15', environment: 'outdoor' });
        const clues = buildTemplateClues(templateId, config.clueCount);
        const rewards = buildTemplateRewards(templateId);
        onApply({ config, clues, rewards, story: buildTemplateStory(templateId) });
      }}
    >
      <Play size={14} /> Load template defaults
    </button>
  );
}
