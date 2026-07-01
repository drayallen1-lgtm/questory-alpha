import React, { useMemo } from 'react';
import { ChevronRight, Hammer, Sparkles } from 'lucide-react';
import { craftArtifact, getCraftingSnapshot } from './craftingEngine';

function RecipeCard({ recipe, onCraft, crafting }) {
  return (
    <div
      className={`crafting-recipe-card${recipe.alreadyCrafted ? ' crafted' : ''}${recipe.canCraft ? ' ready' : ''}`}
    >
      <div className="crafting-recipe-head">
        <span className="crafting-recipe-icon">{recipe.icon}</span>
        <div>
          <strong>{recipe.label}</strong>
          <p>{recipe.desc}</p>
        </div>
      </div>
      <div className="crafting-requirements">
        {recipe.requirements.map((req) => (
          <span
            key={req.id}
            className={`crafting-req-chip${req.met ? ' met' : ''}`}
            title={`${req.have}/${req.qty}`}
          >
            {req.icon} {req.label} ×{req.qty}
            <small>({req.have})</small>
          </span>
        ))}
      </div>
      {recipe.alreadyCrafted ? (
        <span className="crafting-status crafted-label">
          <Sparkles size={14} /> Crafted
        </span>
      ) : (
        <button
          type="button"
          className="crafting-craft-btn"
          disabled={!recipe.canCraft || crafting}
          onClick={() => onCraft(recipe.id)}
        >
          {crafting ? 'Crafting…' : recipe.canCraft ? 'Craft artifact' : recipe.statusMessage}
        </button>
      )}
    </div>
  );
}

export function CraftingPanel({ state, adventures, setState }) {
  const snapshot = useMemo(
    () => getCraftingSnapshot(state, adventures),
    [state, adventures]
  );
  const [craftingId, setCraftingId] = React.useState(null);

  const handleCraft = (recipeId) => {
    setCraftingId(recipeId);
    const result = craftArtifact(state, adventures, recipeId);
    setCraftingId(null);
    if (result.ok && setState) {
      setState(result.state);
    }
  };

  return (
    <div className="crafting-panel">
      <div className="card crafting-head">
        <h3>
          <Hammer size={18} /> Artifact Crafting
        </h3>
        <p>Combine materials from hunts and exploration into permanent upgrades.</p>
        {(snapshot.discoveryRadiusPct > 0 || snapshot.fogRevealRadiusPct > 0) && (
          <div className="crafting-active-bonuses">
            {snapshot.discoveryRadiusPct > 0 && (
              <span>🧭 +{snapshot.discoveryRadiusPct}% discovery radius</span>
            )}
            {snapshot.fogRevealRadiusPct > 0 && (
              <span>🔮 +{snapshot.fogRevealRadiusPct}% fog reveal radius</span>
            )}
          </div>
        )}
      </div>

      {snapshot.craftedArtifacts.length > 0 && (
        <div className="card crafting-owned">
          <h4>Your artifacts</h4>
          <div className="crafting-owned-grid">
            {snapshot.craftedArtifacts.map((artifact) => (
              <div key={artifact.id} className="crafting-owned-chip">
                <span>{artifact.icon}</span>
                <strong>{artifact.label}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="crafting-recipe-list">
        {snapshot.recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onCraft={handleCraft}
            crafting={craftingId === recipe.id}
          />
        ))}
      </div>
    </div>
  );
}

export function CraftingHomeHint({ state, adventures, nav }) {
  const snapshot = useMemo(
    () => getCraftingSnapshot(state, adventures),
    [state, adventures]
  );
  const readyCount = snapshot.recipes.filter((r) => r.canCraft).length;
  if (readyCount === 0 && snapshot.craftedArtifacts.length === 0) return null;

  return (
    <div className="card crafting-home-hint">
      <Hammer size={16} />
      <div>
        <strong>
          {readyCount > 0
            ? `${readyCount} artifact${readyCount > 1 ? 's' : ''} ready to craft`
            : `${snapshot.craftedArtifacts.length} artifact${snapshot.craftedArtifacts.length > 1 ? 's' : ''} active`}
        </strong>
        {nav && (
          <button
            type="button"
            className="ghost crafting-home-link"
            onClick={() => nav('vault', null, { tab: 'crafting' })}
          >
            Open crafting <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
