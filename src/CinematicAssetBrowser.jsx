import React, { useMemo, useState } from 'react';
import { Film, Search, Sparkles } from 'lucide-react';
import {
  CINEMATIC_ASSET_ENGINE,
  getCinematicCategories,
  listEntitiesByCategory,
  matchCinematicEntities,
} from './cinematicAssetCatalog';
import { applyCinematicEntityToScene } from './cinematicAssetEngine';
import { HorrorAnimationPreview } from './horrorAssets/animations';
import { findLibraryAsset } from './mediaStudio';
import { ScenePreviewOverlay } from './CinematicAR';

function EntityTile({ entity, onSelect, onPreview }) {
  const library = findLibraryAsset(entity.libraryAssetId);
  const thumb = library?.previewUrl || library?.assetUrl;

  return (
    <button type="button" className="cinematic-entity-tile" onClick={() => onSelect(entity)}>
      <div className="cinematic-entity-thumb">
        {entity.animPreviewId ? (
          <HorrorAnimationPreview assetId={entity.animPreviewId} className="cinematic-entity-anim" />
        ) : thumb ? (
          <img src={thumb} alt={entity.label} />
        ) : (
          <span>{library?.icon || '🎬'}</span>
        )}
      </div>
      <strong>{entity.label}</strong>
      {entity.safeForKids && <span className="cinematic-entity-safe-badge">Family safe</span>}
      <small>{entity.desc}</small>
      <button
        type="button"
        className="ghost cinematic-entity-preview-btn"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(entity);
        }}
      >
        Preview
      </button>
    </button>
  );
}

export function CinematicAssetBrowser({ onInsertScene, insertTargetLabel }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('characters');
  const [previewEntity, setPreviewEntity] = useState(null);
  const [previewScene, setPreviewScene] = useState(null);

  const categories = getCinematicCategories();

  const entities = useMemo(() => {
    const q = query.trim();
    if (q) return matchCinematicEntities(q, 24);
    return listEntitiesByCategory(category);
  }, [query, category]);

  function handleInsert(entity) {
    const scene = applyCinematicEntityToScene(
      {
        enabled: true,
        title: entity.label,
        description: entity.desc,
        overlayText: entity.desc,
        allowReplay: true,
      },
      entity.id
    );
    onInsertScene?.(scene, entity);
  }

  function handlePreview(entity) {
    const scene = applyCinematicEntityToScene(
      { enabled: true, title: entity.label, description: entity.desc, allowReplay: true },
      entity.id
    );
    setPreviewEntity(entity);
    setPreviewScene(scene);
  }

  return (
    <div className="cinematic-asset-browser card">
      <div className="cinematic-asset-head">
        <h4>
          <Film size={16} /> {CINEMATIC_ASSET_ENGINE.label}
        </h4>
        <p className="admin-meta">
          {CINEMATIC_ASSET_ENGINE.entityCount} cinematic entities · auto-picked by AI Director
          {insertTargetLabel ? ` · inserting into ${insertTargetLabel}` : ''}
        </p>
      </div>

      <div className="cinematic-asset-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ghost bride, friendly dragon, glowing relic..."
        />
      </div>

      {!query.trim() && (
        <div className="cinematic-category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={category === cat.id ? 'active' : 'ghost'}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="cinematic-entity-grid">
        {entities.map((entity) => (
          <EntityTile
            key={entity.id}
            entity={entity}
            onSelect={handleInsert}
            onPreview={handlePreview}
          />
        ))}
      </div>

      {entities.length === 0 && (
        <p className="admin-meta">No entities match — try ghost, dragon, lantern, or portal.</p>
      )}

      <p className="admin-meta cinematic-asset-tip">
        <Sparkles size={14} /> Tip: Scene generator and Adventure Director auto-select entities from this catalog.
      </p>

      <ScenePreviewOverlay
        scene={previewScene}
        open={Boolean(previewScene?.enabled)}
        onClose={() => {
          setPreviewScene(null);
          setPreviewEntity(null);
        }}
      />
      {previewEntity && previewScene?.enabled && (
        <div className="cinematic-preview-actions">
          <button type="button" onClick={() => handleInsert(previewEntity)}>
            Insert {previewEntity.label}
          </button>
        </div>
      )}
    </div>
  );
}
