import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Film,
  ImagePlus,
  Mic,
  Package,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ACCEPTED_MEDIA,
  AI_SCENE_GENERATE_SCAFFOLD,
  HORROR_ASSET_LIBRARY,
  HORROR_QUICK_PACKS,
  LIBRARY_CATEGORIES,
  MARKETPLACE_ASSETS_SCAFFOLD,
  appendToManifest,
  applyHorrorPack,
  insertAssetIntoScene,
  normalizeMediaManifest,
} from './mediaStudio';
import { uploadMediaFile, libraryAssetToMediaAsset } from './supabase/mediaService';

function isMediaUrl(url) {
  return typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:'));
}

function AssetPreviewModal({ asset, onClose, onInsert }) {
  if (!asset) return null;
  const isAudio = asset.type === 'audio';
  const isVideo = asset.type === 'video';
  const previewUrl = asset.previewUrl || asset.thumbnailUrl || asset.publicUrl || asset.assetUrl;

  return (
    <div className="media-preview-modal" role="dialog" aria-modal="true">
      <div className="media-preview-backdrop" onClick={onClose} />
      <div className="media-preview-card card">
        <button type="button" className="ghost icon-btn media-preview-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h4>{asset.title}</h4>
        <div className="media-preview-body">
          {isAudio && (
            <div className="media-preview-audio">
              <Volume2 size={48} />
              <audio controls src={asset.audioUrl || asset.publicUrl} />
            </div>
          )}
          {isVideo && isMediaUrl(asset.publicUrl) && (
            <video controls playsInline src={asset.publicUrl} className="media-preview-video" />
          )}
          {!isAudio && !isVideo && previewUrl && isMediaUrl(previewUrl) && (
            <img src={previewUrl} alt={asset.title} className="media-preview-image" />
          )}
          {!isAudio && !isVideo && !isMediaUrl(previewUrl) && (
            <div className="media-preview-emoji">{previewUrl || asset.icon || '🎬'}</div>
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

export function MediaStudioPanel({
  userId,
  adventureId,
  mediaManifest = [],
  onManifestChange,
  onInsertAsset,
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
                {asset.type === 'image' && asset.publicUrl ? (
                  <img src={asset.publicUrl} alt={asset.title} />
                ) : (
                  <span className="media-asset-icon">
                    {asset.type === 'audio' ? '🔊' : asset.type === 'video' ? '🎥' : '🖼'}
                  </span>
                )}
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
              {item.previewUrl ? (
                <img src={item.previewUrl} alt={item.title} />
              ) : (
                <span className="media-asset-icon">{item.icon}</span>
              )}
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

      <button type="button" className="ghost ai-scene-scaffold" disabled title={AI_SCENE_GENERATE_SCAFFOLD.placeholderPrompt}>
        <Wand2 size={16} /> {AI_SCENE_GENERATE_SCAFFOLD.label}
      </button>

      <AssetPreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onInsert={(asset) => {
          if (asset.publicUrl || asset.audioUrl || asset.assetUrl || asset.previewUrl) {
            handleInsert(asset.source ? asset : libraryAssetToMediaAsset(asset));
          } else {
            handleInsert(libraryAssetToMediaAsset(asset));
          }
        }}
      />
    </div>
  );
}

export { insertAssetIntoScene };
