import React, { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import { CURRENCY_TYPES, getExplorerEconomySnapshot } from './explorerEconomyEngine';

export function ExplorerEconomyPanel({ state, adventures }) {
  const snapshot = useMemo(
    () => getExplorerEconomySnapshot(state, adventures),
    [state, adventures]
  );

  return (
    <div className="explorer-economy-panel">
      <div className="card explorer-economy-head">
        <h3>
          <Wallet size={18} /> Explorer Economy
        </h3>
        <p>Coins, relics, keys, shards, and materials earned across your journey.</p>
        <div className="explorer-wealth">
          Total wealth index: <strong>{snapshot.stats.totalWealth}</strong>
        </div>
      </div>

      <div className="explorer-wallet-grid">
        {snapshot.wallets.map((wallet) => (
          <div key={wallet.type} className={`explorer-wallet-card type-${wallet.type}`}>
            <span className="explorer-wallet-icon">{wallet.icon}</span>
            <strong>{wallet.amount}</strong>
            <small>{wallet.label}</small>
          </div>
        ))}
      </div>

      {snapshot.relicInventory.length > 0 && (
        <div className="card">
          <h4>Relic inventory</h4>
          <div className="explorer-relic-grid">
            {snapshot.relicInventory.map((relic) => (
              <div key={relic.id} className="explorer-relic-chip">
                <span>{relic.icon}</span>
                <div>
                  <strong>{relic.name}</strong>
                  <small>{relic.source}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.craftingMaterials.length > 0 && (
        <div className="card">
          <h4>Crafting materials</h4>
          <p className="admin-meta">Combine materials in the Craft tab to craft permanent upgrades.</p>
          <div className="explorer-material-grid">
            {snapshot.craftingMaterials.map((mat) => (
              <div key={mat.id} className={`explorer-material-chip rarity-${mat.rarity}`}>
                <span>{mat.icon}</span>
                <strong>{mat.label}</strong>
                <small>×{mat.qty}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.bossLoot.length > 0 && (
        <div className="card explorer-boss-loot">
          <h4>Boss loot</h4>
          {snapshot.bossLoot.map((item) => (
            <div key={item.id} className="explorer-relic-chip">
              <span>{item.icon}</span>
              <div>
                <strong>{item.name}</strong>
                <small>World Boss reward</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card explorer-economy-foot">
        <small>
          {snapshot.stats.completedAdventures} adventures completed · {snapshot.stats.fogReveals}{' '}
          fog tiles revealed · Seasonal tokens accrue with season points
        </small>
      </div>
    </div>
  );
}

export function ExplorerWalletStrip({ state, adventures }) {
  const snapshot = useMemo(
    () => getExplorerEconomySnapshot(state, adventures),
    [state, adventures]
  );
  const highlight = snapshot.wallets.filter((w) =>
    [CURRENCY_TYPES.COINS, CURRENCY_TYPES.WORLD_SHARDS, CURRENCY_TYPES.RELICS].includes(w.type)
  );

  return (
    <div className="explorer-wallet-strip">
      {highlight.map((w) => (
        <span key={w.type} className="explorer-wallet-pill" title={w.desc}>
          {w.icon} {w.amount}
        </span>
      ))}
    </div>
  );
}
