import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Film,
  ImagePlus,
  Mic,
  Package,
  Play,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ACCEPTED_MEDIA,
  HORROR_ASSET_LIBRARY,
  HORROR_QUICK_PACKS,
  LIBRARY_CATEGORIES,
  MARKETPLACE_ASSETS_SCAFFOLD,
  appendToManifest,
  applyHorrorPack,
  insertAssetIntoScene,
  normalizeMediaManifest,
} from './mediaStudio';
import { AI_SCENE_GENERATOR, generateSceneFromPrompt } from './aiSceneGenerator';
import { ScenePreviewOverlay } from './CinematicAR';
import { uploadMediaFile, libraryAssetToMediaAsset } from './supabase/mediaService';
import { HorrorAnimationPreview } from './horrorAssets/animations';

function isMediaUrl(url) {
  return typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/'));
}

function AssetThumbnail({ asset, className = '' }) {
  const [failed, setFailed] = useState(false);
  const isAudio = asset.type === 'audio';
  const isAnimation = asset.type === 'animation' || asset.animated;
  const thumbUrl = asset.previewUrl || asset.thumbnailUrl || asset.publicUrl || asset.assetUrl;

  if (isAnimation && asset.id) {
    return (
      <div className={`media-asset-thumb-wrap animated ${className}`}>
        <HorrorAnimationPreview assetId={asset.id} className="media-asset-anim-preview" />
        <span className="media-anim-badge">GIF</span>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className={`media-asset-thumb-wrap audio ${className}`}>
        <Volume2 size={28} />
        <span className="media-audio-badge">▶</span>
      </div>
    );
  }

  if (thumbUrl && !failed && (isMediaUrl(thumbUrl) || thumbUrl.startsWith('/'))) {
    return (
      <img
        className={`media-asset-thumb-img ${className}`}
        src={thumbUrl}
        alt={asset.title || ''}
        onError={() => setFailed(true)}
      />
    );
  }

  return <span className={`media-asset-icon ${className}`}>{asset.icon || '🎬'}</span>;
}

function AssetPreviewModal({ asset, onClose, onInsert }) {
  if (!asset) return null;
  const isAudio = asset.type === 'audio';
  const isVideo = asset.type === 'video';
  const isAnimation = asset.type === 'animation' || asset.animated;
  const previewUrl = asset.previewUrl || asset.thumbnailUrl || asset.publicUrl || asset.assetUrl;
  const audioSrc = asset.audioUrl || (isAudio ? previewUrl : null);

  return (
    <div className="media-preview-modal" role="dialog" aria-modal="true">
      <div className="media-preview-backdrop" onClick={onClose} />
      <div className="media-preview-card card">
        <button type="button" className="ghost icon-btn media-preview-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h4>{asset.title}</h4>
        {asset.offline && <p className="media-offline-badge">Bundled · works offline</p>}
        <div className="media-preview-body">
          {isAnimation && asset.id && (
            <HorrorAnimationPreview assetId={asset.id} className="media-preview-anim" />
          )}
          {isAudio && audioSrc && (
            <div className="media-preview-audio">
              <Volume2 size={48} />
              <audio controls autoPlay src={audioSrc} />
              <p className="admin-meta">Preview audio before inserting into your scene.</p>
            </div>
          )}
          {isVideo && isMediaUrl(asset.publicUrl) && (
            <video controls playsInline src={asset.publicUrl} className="media-preview-video" />
          )}
          {!isAudio && !isVideo && !isAnimation && previewUrl && (
            <img src={previewUrl} alt={asset.title} className="media-preview-image" />
          )}
          {!isAudio && !isVideo && !isAnimation && !previewUrl && (
            <div className="media-preview-emoji">{asset.icon || '🎬'}</div>
          )}
        </div>
        <button type="button" className="media-insert-btn" onClick={() => onInsert(asset)}>
          Insert Into Scene
        </button>
      </div>
    </div>
  );
}

function UploadProgressBar({ progress }) {
  if (progress == null || progress >= 100) return null;
  return (
    <div className="media-upload-progress">
      <i style={{ width: `${progress}%` }} />
      <span>Uploading… {progress}%</span>
    </div>
  );
}

function GeneratedSceneSummary({ result, onPreview }) {
  const s = result.summary;
  if (!s) return null;
  return (
    <div className="ai-scene-result card mini">
      <h4>Generated Scene</h4>
      <dl className="ai-scene-result-grid">
        <div><dt>Title</dt><dd>{s.title}</dd></div>
        <div><dt>Scene Type</dt><dd>{s.sceneType}</dd></div>
        {s.visuals?.length > 0 && (
          <div><dt>Visuals</dt><dd>{s.visuals.join(' · ')}</dd></div>
        )}
        {s.audio?.length > 0 && (
          <div><dt>Audio</dt><dd>{s.audio.join(' · ')}</dd></div>
        )}
        {s.dialogue && (
          <div><dt>Dialogue</dt><dd>&ldquo;{s.dialogue}&rdquo;</dd></div>
        )}
        {s.fx && (
          <div><dt>FX</dt><dd>{s.fx}</dd></div>
        )}
        {s.timeline && (
          <div><dt>Timeline</dt><dd>{s.timeline}</dd></div>
        )}
        {!s.dialogue && s.overlayText && (
          <div><dt>Overlay</dt><dd>&ldquo;{s.overlayText}&rdquo;</dd></div>
        )}
        <div><dt>Trigger</dt><dd>{s.trigger}</dd></div>
        <div><dt>Duration</dt><dd>{s.durationSeconds} seconds</dd></div>
        <div><dt>Replay</dt><dd>{s.replay}</dd></div>
        {s.finaleTheme && (
          <div><dt>Finale Suggestion</dt><dd>{s.finaleTheme}</dd></div>
        )}
      </dl>
      <div className="ai-scene-result-actions">
        {result.scene?.enabled && (
          <button type="button" className="ghost ar-scene-preview-btn" onClick={() => onPreview?.(result.scene)}>
            <Play size={16} /> Preview Scene
          </button>
        )}
      </div>
      <p className="admin-meta ai-scene-applied">Scene card inserted into your selected target above.</p>
    </div>
  );
}

function AISceneGeneratorPanel({ insertTarget, onGenerateScene }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previewScene, setPreviewScene] = useState(null);

  function handleGenerate() {
    setError('');
    const generated = generateSceneFromPrompt(prompt);
    if (!generated.ok) {
      setError(generated.message);
      setResult(null);
      return;
    }
    setResult(generated);
    onGenerateScene?.(generated, insertTarget);
  }

  return (
    <div className="ai-scene-generator card mini">
      <h4>
        <Wand2 size={16} /> {AI_SCENE_GENERATOR.label}
      </h4>
      <p className="admin-meta">
        Tell Questory the story — local AI matches assets, audio, and overlay instantly. No API. No uploads.
      </p>
      <textarea
        className="ai-scene-prompt"
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={AI_SCENE_GENERATOR.placeholder}
      />
      <div className="ai-scene-examples">
        {AI_SCENE_GENERATOR.examples.map((ex) => (
          <button key={ex} type="button" className="ghost ai-scene-example-btn" onClick={() => setPrompt(ex)}>
            {ex.length > 72 ? `${ex.slice(0, 72)}…` : ex}
          </button>
        ))}
      </div>
      <button type="button" className="ai-scene-generate-btn" onClick={handleGenerate} disabled={!prompt.trim()}>
        <Sparkles size={16} /> {AI_SCENE_GENERATOR.label}
      </button>
      {error && <p className="media-upload-error">{error}</p>}
      {result?.ok && (
        <GeneratedSceneSummary result={result} onPreview={setPreviewScene} />
      )}
      <ScenePreviewOverlay
        scene={previewScene}
        open={Boolean(previewScene?.enabled)}
        onClose={() => setPreviewScene(null)}
      />
    </div>
  );
}

export function MediaStudioPanel({
  userId,
  adventureId,
  mediaManifest = [],
  onManifestChange,
  onInsertAsset,
  onGenerateScene,
  clues = [],
  setClues,
  setArFinale,
  showArMode = true,
}) {
  const [libraryCategory, setLibraryCategory] = useState('ghosts');
  const [previewAsset, setPreviewAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [insertTarget, setInsertTarget] = useState('clue-0');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const [recording, setRecording] = useState(null);

  const manifest = normalizeMediaManifest(mediaManifest);
  const advId = adventureId || `draft-${userId || 'local'}`;

  useEffect(() => {
    if (insertTarget.startsWith('clue-') && clues.length === 0) {
      setInsertTarget('finale');
    }
  }, [clues.length, insertTarget]);

  const handleUpload = useCallback(
    async (file, title) => {
      if (!file) return;
      setUploadError('');
      setUploadProgress(5);
      const result = await uploadMediaFile({
        file,
        userId,
        adventureId: advId,
        title: title || file.name,
        onProgress: setUploadProgress,
      });
      setUploadProgress(null);
      if (!result.ok) {
        setUploadError(result.message || 'Upload failed.');
        return;
      }
      onManifestChange?.(appendToManifest(manifest, result.asset));
    },
    [userId, advId, manifest, onManifestChange]
  );

  const handleFiles = useCallback(
    (files) => {
      const list = Array.from(files || []);
      list.forEach((file) => handleUpload(file));
    },
    [handleUpload]
  );

  function handleInsert(asset) {
    const normalized = asset.source ? asset : libraryAssetToMediaAsset(asset);
    onInsertAsset?.(normalized, insertTarget);
    setPreviewAsset(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleUpload(file, 'Voice recording');
        setRecording(null);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording('audio');
    } catch {
      setUploadError('Microphone access denied.');
    }
  }

  function stopVoiceRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function startVideoRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        await handleUpload(file, 'Video recording');
        setRecording(null);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording('video');
    } catch {
      setUploadError('Camera access denied.');
    }
  }

  function stopVideoRecording() {
    mediaRecorderRef.current?.stop();
  }

  function applyPack(packId) {
    applyHorrorPack(packId, { clues, setClues, setArFinale });
  }

  if (!showArMode) return null;

  const libraryItems = HORROR_ASSET_LIBRARY[libraryCategory] || [];

  return (
    <div className="media-studio-panel card">
      <div className="media-studio-head">
        <h3>
          <Film size={18} /> Media Studio
        </h3>
        <p className="admin-meta">Upload, preview, and insert horror assets — no external tools needed.</p>
      </div>

      <label>Insert into</label>
      <select value={insertTarget} onChange={(e) => setInsertTarget(e.target.value)}>
        {clues.map((c, i) => (
          <option key={c.id} value={`clue-${i}`}>
            Clue {i + 1}{c.title ? `: ${c.title}` : ''}
          </option>
        ))}
        <option value="finale">AR Finale</option>
      </select>

      <AISceneGeneratorPanel insertTarget={insertTarget} onGenerateScene={onGenerateScene} />

      <div
        className={`media-drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload size={28} />
        <p>Drag & drop images, audio, or video</p>
        <div className="media-upload-actions">
          <button type="button" className="ghost" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={16} /> Browse files
          </button>
          <button type="button" className="ghost" onClick={() => photoInputRef.current?.click()}>
            <Camera size={16} /> Take photo
          </button>
          {recording === 'audio' ? (
            <button type="button" className="ghost recording" onClick={stopVoiceRecording}>
              <Mic size={16} /> Stop recording
            </button>
          ) : (
            <button type="button" className="ghost" onClick={startVoiceRecording}>
              <Mic size={16} /> Record voice
            </button>
          )}
          {recording === 'video' ? (
            <button type="button" className="ghost recording" onClick={stopVideoRecording}>
              <Film size={16} /> Stop video
            </button>
          ) : (
            <button type="button" className="ghost" onClick={startVideoRecording}>
              <Film size={16} /> Record video
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MEDIA}
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <UploadProgressBar progress={uploadProgress} />
      {uploadError && <p className="media-upload-error">{uploadError}</p>}

      {manifest.length > 0 && (
        <div className="media-uploads-grid">
          <h4>Your uploads</h4>
          <div className="media-asset-grid">
            {manifest.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="media-asset-tile"
                onClick={() => setPreviewAsset(asset)}
              >
                <AssetThumbnail asset={asset} />
                <small>{asset.title}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="media-library-section">
        <h4>
          <Sparkles size={16} /> Horror Asset Library
        </h4>
        <div className="media-category-tabs">
          {LIBRARY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={libraryCategory === cat.id ? 'active' : 'ghost'}
              onClick={() => setLibraryCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="media-asset-grid">
          {libraryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="media-asset-tile library"
              onClick={() => setPreviewAsset(item)}
            >
              <AssetThumbnail asset={item} />
              <small>{item.title}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="media-quick-packs">
        <h4>
          <Package size={16} /> Quick Horror Packs
        </h4>
        <div className="media-pack-list">
          {Object.values(HORROR_QUICK_PACKS).map((pack) => (
            <button key={pack.id} type="button" className="ghost media-pack-btn" onClick={() => applyPack(pack.id)}>
              <strong>{pack.label}</strong>
              <span>{pack.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="media-marketplace-scaffold">
        <h4>Creator Marketplace</h4>
        <p className="admin-meta">Sell horror packs and AR assets — coming soon.</p>
        <ul>
          {MARKETPLACE_ASSETS_SCAFFOLD.map((item) => (
            <li key={item.id}>
              {item.title} — {item.priceCoins} coins
              <span className="coming-soon-badge">Soon</span>
            </li>
          ))}
        </ul>
      </div>

      <AssetPreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onInsert={(asset) => {
          const normalized =
            asset.source === 'upload' ? asset : libraryAssetToMediaAsset(asset);
          handleInsert(normalized);
        }}
      />
    </div>
  );
}

export { insertAssetIntoScene };
