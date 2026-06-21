import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  AR_ASSET_TYPES,
  AR_ATMOSPHERES,
  AR_INTERACTIONS,
  AR_SCENE_TYPE_LABELS,
  AR_SCENE_TYPES,
  AR_TRIGGERS,
  emptyArScene,
  normalizeArScene,
} from './arEngine';
import { getSceneThumbnail, triggerLabel } from './mediaStudio';

function SceneThumbnail({ scene }) {
  const thumb = getSceneThumbnail(scene);
  const isUrl = typeof thumb === 'string' && (thumb.startsWith('http') || thumb.startsWith('data:'));

  if (isUrl) {
    return <img className="ar-scene-card-thumb" src={thumb} alt="" />;
  }
  return <div className="ar-scene-card-thumb emoji">{thumb}</div>;
}

function VisualSceneCard({ scene, onChange, compact = false }) {
  const s = normalizeArScene(scene);
  const [expanded, setExpanded] = useState(!s.enabled);

  function patch(fields) {
    onChange(normalizeArScene({ ...s, ...fields }));
  }

  return (
    <div className={`ar-scene-card ${s.enabled ? 'enabled' : ''} ${compact ? 'compact' : ''}`}>
      <div className="ar-scene-card-header">
        <SceneThumbnail scene={s} />
        <div className="ar-scene-card-meta">
          <strong>{s.title || 'Untitled Scene'}</strong>
          {s.enabled && (
            <>
              <p className="ar-scene-card-desc">{s.description || s.overlayText || 'No description yet'}</p>
              <div className="ar-scene-card-tags">
                <span>Trigger: {triggerLabel(s.trigger)}</span>
                <span>{s.durationSeconds}s</span>
                {s.allowReplay && <span>Replay</span>}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className="ghost icon-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse scene editor' : 'Expand scene editor'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <div className="ar-scene-fields">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
            />
            Enable AR scene
          </label>

          {s.enabled && (
            <>
              <label>Scene Title</label>
              <input
                value={s.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="The Girl Appears"
              />

              <label>Scene Description</label>
              <textarea
                value={s.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={2}
                placeholder="Whispers from the swing..."
              />

              <label>Scene Type</label>
              <select value={s.sceneType} onChange={(e) => patch({ sceneType: e.target.value })}>
                {Object.entries(AR_SCENE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <label>Trigger</label>
              <select value={s.trigger} onChange={(e) => patch({ trigger: e.target.value })}>
                <option value={AR_TRIGGERS.ON_ARRIVAL}>On arrival</option>
                <option value={AR_TRIGGERS.AFTER_CHECKIN}>After GPS check-in</option>
                <option value={AR_TRIGGERS.AFTER_ANSWER}>After answer/puzzle</option>
                <option value={AR_TRIGGERS.FINDER_CAPTURE}>Finder capture</option>
              </select>

              <label>Overlay Text</label>
              <input
                value={s.overlayText}
                onChange={(e) => patch({ overlayText: e.target.value })}
                placeholder="Subtitle dialogue"
              />

              <label>Duration (seconds)</label>
              <input
                type="number"
                min="3"
                max="120"
                value={s.durationSeconds}
                onChange={(e) => patch({ durationSeconds: parseInt(e.target.value, 10) || 8 })}
              />

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={s.allowReplay}
                  onChange={(e) => patch({ allowReplay: e.target.checked })}
                />
                Allow replay after scene completes
              </label>

              <details className="ar-scene-advanced">
                <summary>Advanced settings</summary>
                <label>Asset Type</label>
                <select value={s.assetType} onChange={(e) => patch({ assetType: e.target.value })}>
                  <option value={AR_ASSET_TYPES.NONE}>None (icon overlay)</option>
                  <option value={AR_ASSET_TYPES.IMAGE}>Image</option>
                  <option value={AR_ASSET_TYPES.VIDEO}>Video</option>
                  <option value={AR_ASSET_TYPES.MODEL}>3D Model placeholder</option>
                </select>

                {(s.assetType === AR_ASSET_TYPES.IMAGE ||
                  s.assetType === AR_ASSET_TYPES.VIDEO ||
                  s.assetType === AR_ASSET_TYPES.MODEL) &&
                  s.assetUrl && (
                    <p className="admin-meta ar-scene-media-attached">Media attached from Media Studio</p>
                  )}

                <label>Atmosphere</label>
                <select value={s.atmosphere} onChange={(e) => patch({ atmosphere: e.target.value })}>
                  <option value={AR_ATMOSPHERES.NONE}>None</option>
                  <option value={AR_ATMOSPHERES.FOG}>Fog</option>
                  <option value={AR_ATMOSPHERES.STATIC}>Static</option>
                  <option value={AR_ATMOSPHERES.DARKNESS}>Darkness</option>
                  <option value={AR_ATMOSPHERES.FLASH}>Flash</option>
                  <option value={AR_ATMOSPHERES.LANTERN}>Lantern glow</option>
                </select>

                <label>Interaction</label>
                <select value={s.interaction} onChange={(e) => patch({ interaction: e.target.value })}>
                  <option value={AR_INTERACTIONS.WATCH}>Watch only</option>
                  <option value={AR_INTERACTIONS.TAP_REVEAL}>Tap to reveal</option>
                  <option value={AR_INTERACTIONS.TAP_COLLECT}>Tap to collect</option>
                  <option value={AR_INTERACTIONS.CHOICE}>Choice</option>
                </select>

                <label>Reveal Text</label>
                <input
                  value={s.revealText}
                  onChange={(e) => patch({ revealText: e.target.value })}
                  placeholder="Shown after tap-to-reveal"
                />

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={s.jumpScare}
                    onChange={(e) => patch({ jumpScare: e.target.checked })}
                  />
                  Jump scare flash
                </label>
              </details>

              <button
                type="button"
                className="ghost ar-scene-save-hint"
                onClick={() => setExpanded(false)}
              >
                Save Scene
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ClueArSceneBuilder({ clue, onChange, showArMode }) {
  if (!showArMode) return null;

  return (
    <div className="ar-scene-builder card mini">
      <h4>
        <Sparkles size={16} /> AR Scene
      </h4>
      <VisualSceneCard
        scene={clue.arScene || emptyArScene()}
        onChange={(arScene) => onChange({ arScene })}
        compact
      />
    </div>
  );
}

export function ArFinaleBuilder({ arFinale, arTheme, onFinaleChange, onThemeChange, showArMode }) {
  if (!showArMode) return null;

  return (
    <div className="ar-finale-builder card">
      <h3>
        <Sparkles size={18} /> AR Finale
      </h3>
      <p className="admin-meta">Plays after medallion capture in AR Enhanced adventures.</p>
      <label>AR Theme</label>
      <select value={arTheme || 'none'} onChange={(e) => onThemeChange(e.target.value)}>
        <option value="none">None</option>
        <option value="horror">Horror</option>
        <option value="fantasy">Fantasy</option>
        <option value="family">Family</option>
        <option value="custom">Custom</option>
      </select>
      <VisualSceneCard scene={arFinale || emptyArScene()} onChange={onFinaleChange} />
    </div>
  );
}

export function WhisperingHollowQuickButton({ onApply }) {
  return (
    <button type="button" className="ghost whispering-hollow-btn" onClick={onApply}>
      <Sparkles size={16} /> Load &quot;The Whispering Hollow&quot; AR Preset
    </button>
  );
}

export { VisualSceneCard, AR_SCENE_TYPES };
