import React from 'react';
import { Sparkles } from 'lucide-react';
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

function ArSceneFields({ scene, onChange, compact = false }) {
  const s = normalizeArScene(scene);

  function patch(fields) {
    onChange(normalizeArScene({ ...s, ...fields }));
  }

  return (
    <div className={`ar-scene-fields ${compact ? 'compact' : ''}`}>
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
          <label>Scene Type</label>
          <select value={s.sceneType} onChange={(e) => patch({ sceneType: e.target.value })}>
            {Object.entries(AR_SCENE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label>Scene Title</label>
          <input
            value={s.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Ghost in the yard"
          />

          <label>Scene Description</label>
          <textarea
            value={s.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={2}
            placeholder="What the player experiences"
          />

          <label>Asset Type</label>
          <select value={s.assetType} onChange={(e) => patch({ assetType: e.target.value })}>
            <option value={AR_ASSET_TYPES.NONE}>None (icon overlay)</option>
            <option value={AR_ASSET_TYPES.IMAGE}>Image URL</option>
            <option value={AR_ASSET_TYPES.AUDIO}>Audio URL</option>
            <option value={AR_ASSET_TYPES.VIDEO}>Video URL</option>
            <option value={AR_ASSET_TYPES.MODEL}>3D Model (.glb) placeholder</option>
          </select>

          {(s.assetType === AR_ASSET_TYPES.IMAGE ||
            s.assetType === AR_ASSET_TYPES.VIDEO ||
            s.assetType === AR_ASSET_TYPES.MODEL) && (
            <>
              <label>Asset URL</label>
              <input
                value={s.assetUrl}
                onChange={(e) => patch({ assetUrl: e.target.value })}
                placeholder="https://..."
              />
            </>
          )}

          <label>Audio URL</label>
          <input
            value={s.audioUrl}
            onChange={(e) => patch({ audioUrl: e.target.value })}
            placeholder="Whisper, ambience, jump sting..."
          />

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

          <label>Reveal Text</label>
          <input
            value={s.revealText}
            onChange={(e) => patch({ revealText: e.target.value })}
            placeholder="Shown after tap-to-reveal"
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
              checked={s.jumpScare}
              onChange={(e) => patch({ jumpScare: e.target.checked })}
            />
            Jump scare flash
          </label>
        </>
      )}
    </div>
  );
}

export function ClueArSceneBuilder({ clue, onChange, showArMode }) {
  if (!showArMode) return null;

  return (
    <div className="ar-scene-builder card mini">
      <h4>
        <Sparkles size={16} /> AR Scene Builder
      </h4>
      <ArSceneFields
        scene={clue.arScene || emptyArScene()}
        onChange={(arScene) => onChange({ arScene })}
      />
    </div>
  );
}

export function ArFinaleBuilder({ arFinale, arTheme, onFinaleChange, onThemeChange, showArMode }) {
  if (!showArMode) return null;

  return (
    <div className="ar-finale-builder card">
      <h3>
        <Sparkles size={18} /> AR Finale Builder
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
      <ArSceneFields
        scene={arFinale || emptyArScene()}
        onChange={onFinaleChange}
      />
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

export { AR_SCENE_TYPES };
