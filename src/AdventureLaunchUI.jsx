import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Map, Settings2, Sparkles, Wand2 } from 'lucide-react';
import {
  LAUNCH_STEP_IDS,
  generateLaunchDraft,
  getAdventureLaunchSnapshot,
} from './adventureLaunchEngine';
import { formatUserErrorMessage } from './claimSystem';

function LaunchStepRail({ steps, currentStep }) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  return (
    <ol className="adventure-launch-rail" aria-label="Launch steps">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={`adventure-launch-rail-step${
            step.id === currentStep ? ' adventure-launch-rail-step--active' : ''
          }${index < currentIndex ? ' adventure-launch-rail-step--done' : ''}`}
        >
          <span className="adventure-launch-rail-dot" aria-hidden />
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function AdventureLaunchUI({
  state,
  launchStep,
  onStepChange,
  onOpenAdvanced,
  onPreviewMap,
  onPublish,
  saving = false,
}) {
  const [prompt, setPrompt] = useState(state?.launchPrompt || '');
  const [draft, setDraft] = useState(null);
  const [refine, setRefine] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const directorBootstrapped = useRef(false);

  const snapshot = useMemo(
    () =>
      getAdventureLaunchSnapshot(state, {
        step: launchStep,
        prompt,
        draft,
      }),
    [state, launchStep, prompt, draft]
  );

  useEffect(() => {
    if (state?.launchPrompt && !prompt) {
      setPrompt(state.launchPrompt);
    }
  }, [state?.launchPrompt, prompt]);

  useEffect(() => {
    if (launchStep !== LAUNCH_STEP_IDS.DIRECTOR) {
      directorBootstrapped.current = false;
      return;
    }
    if (directorBootstrapped.current || !prompt.trim() || draft?.ok) return;
    directorBootstrapped.current = true;
    handleGenerate();
  }, [launchStep, prompt, draft?.ok]);

  function handleGenerate(nextPrompt = prompt) {
    const text = String(nextPrompt || '').trim();
    if (!text) {
      setError('Describe your adventure idea first.');
      return;
    }
    setGenerating(true);
    setError('');
    const result = generateLaunchDraft(text);
    setDraft(result);
    if (!result.ok) {
      setError(formatUserErrorMessage(result) || result.message || 'Could not generate adventure.');
    }
    setGenerating(false);
  }

  function handleContinueFromDescribe() {
    if (!prompt.trim()) {
      setError('Tell the AI Director what you want to build.');
      return;
    }
    setError('');
    onStepChange?.(LAUNCH_STEP_IDS.DIRECTOR);
  }

  function handleContinueFromDirector() {
    if (!draft?.ok) {
      setError('Wait for the Director to finish shaping your adventure.');
      return;
    }
    setError('');
    onStepChange?.(LAUNCH_STEP_IDS.PREVIEW);
  }

  function handleContinueToPublish() {
    if (!draft?.ok) return;
    onStepChange?.(LAUNCH_STEP_IDS.PUBLISH);
  }

  return (
    <div className="adventure-launch">
      <div className="section-head adventure-launch-head">
        <div>
          <h2>Launch an Adventure</h2>
          <p>Describe your idea — the AI Director shapes the trail, you preview, then publish.</p>
        </div>
        <button type="button" className="ghost adventure-launch-advanced" onClick={onOpenAdvanced}>
          <Settings2 size={16} /> Advanced Options
        </button>
      </div>

      <LaunchStepRail steps={snapshot.steps} currentStep={snapshot.step} />

      {error && <p className="form-error">{error}</p>}

      {snapshot.step === LAUNCH_STEP_IDS.DESCRIBE && (
        <section className="card adventure-launch-panel">
          <h3>
            <Wand2 size={18} /> Describe your idea
          </h3>
          <p className="admin-meta">One sentence is enough — tone, audience, and setting all help.</p>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder='e.g. "Haunted backyard ghost hunt for teens with a lantern finale"'
            rows={4}
            autoFocus
          />
          <div className="adventure-launch-suggestions">
            {snapshot.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="ghost"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button type="button" className="adventure-launch-primary" onClick={handleContinueFromDescribe}>
            Continue to AI Director
            <ChevronRight size={16} />
          </button>
        </section>
      )}

      {snapshot.step === LAUNCH_STEP_IDS.DIRECTOR && (
        <section className="card adventure-launch-panel">
          <h3>
            <Sparkles size={18} /> AI Director
          </h3>
          <p className="admin-meta">
            {generating
              ? 'Shaping story beats, clue trail, rewards, and map pins…'
              : 'Your adventure blueprint is ready when the Director finishes.'}
          </p>
          <blockquote className="adventure-launch-prompt">“{prompt}”</blockquote>
          {generating && <p className="adventure-launch-generating" aria-live="polite">Generating…</p>}
          {draft?.ok && (
            <div className="adventure-launch-draft">
              <p>{draft.summary}</p>
              <p>
                <strong>{draft.meta.title}</strong> · {draft.clues.length} clues ·{' '}
                {draft.meta.estimatedMinutes} min
              </p>
              {draft.blueprint?.characters?.length > 0 && (
                <p className="admin-meta">
                  Characters: {draft.blueprint.characters.map((c) => c.name).join(', ')}
                </p>
              )}
              <input
                value={refine}
                onChange={(event) => setRefine(event.target.value)}
                placeholder="Refine: scarier, shorter, add a clue…"
              />
              <div className="adventure-launch-actions">
                <button type="button" className="ghost" onClick={() => handleGenerate(prompt)} disabled={generating}>
                  Regenerate
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className="adventure-launch-primary"
            onClick={handleContinueFromDirector}
            disabled={!draft?.ok || generating}
          >
            Preview Adventure
            <ChevronRight size={16} />
          </button>
        </section>
      )}

      {snapshot.step === LAUNCH_STEP_IDS.PREVIEW && snapshot.preview.ready && (
        <section className="card adventure-launch-panel">
          <h3>{snapshot.preview.title}</h3>
          <p className="adventure-launch-story">{snapshot.preview.story}</p>
          <div className="adventure-launch-metrics">
            <span>{snapshot.preview.clueCount} clues</span>
            <span>{snapshot.preview.estimatedMinutes} min</span>
            <span>{snapshot.preview.location}</span>
          </div>
          <ul className="adventure-launch-clues">
            {snapshot.preview.clues.map((clue, index) => (
              <li key={clue.id}>
                <span className="adventure-launch-clue-icon" aria-hidden>
                  {clue.icon}
                </span>
                <div>
                  <strong>
                    {index + 1}. {clue.title}
                  </strong>
                  <small>
                    {clue.latitude && clue.longitude
                      ? `${Number(clue.latitude).toFixed(4)}, ${Number(clue.longitude).toFixed(4)}`
                      : 'Map pin pending'}
                  </small>
                </div>
              </li>
            ))}
          </ul>
          {snapshot.preview.rewards.length > 0 && (
            <div className="adventure-launch-rewards">
              {snapshot.preview.rewards.map((reward) => (
                <span key={reward.id} className="adventure-launch-reward-chip">
                  {reward.icon} {reward.label}
                </span>
              ))}
            </div>
          )}
          <div className="adventure-launch-actions">
            <button type="button" className="ghost" onClick={() => onStepChange?.(LAUNCH_STEP_IDS.DESCRIBE)}>
              Edit idea
            </button>
            <button type="button" className="ghost" onClick={onPreviewMap} disabled={!draft?.ok}>
              <Map size={16} /> Preview pins on map
            </button>
          </div>
          <button type="button" className="adventure-launch-primary" onClick={handleContinueToPublish}>
            Ready to publish
            <ChevronRight size={16} />
          </button>
        </section>
      )}

      {snapshot.step === LAUNCH_STEP_IDS.PUBLISH && snapshot.preview.ready && (
        <section className="card adventure-launch-panel adventure-launch-publish">
          <h3>Publish your adventure</h3>
          <p className="admin-meta">
            Save a draft now — publish live from Admin when you are ready to open the trail.
          </p>
          <div className="adventure-launch-publish-card">
            <strong>{snapshot.preview.title}</strong>
            <p>{snapshot.preview.summary || snapshot.preview.story}</p>
          </div>
          <button
            type="button"
            className="adventure-launch-primary"
            onClick={() => onPublish?.(draft)}
            disabled={saving || !draft?.ok}
          >
            {saving ? 'Saving…' : 'Save Adventure Draft'}
          </button>
          <button type="button" className="ghost" onClick={() => onStepChange?.(LAUNCH_STEP_IDS.PREVIEW)}>
            Back to preview
          </button>
        </section>
      )}
    </div>
  );
}
