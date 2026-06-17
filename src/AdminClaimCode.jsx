import React from 'react';
import { Lock } from 'lucide-react';
import { getAdminClaimSecrets } from './claimSystem';

export function AdminClaimCode({ adventure }) {
  const secrets = getAdminClaimSecrets(adventure);
  if (!secrets.length) return null;

  return (
    <div className="admin-claim-secrets">
      {secrets.map((item) => (
        <p key={item.label} className={item.hint ? 'admin-claim-hint' : 'admin-claim-code'}>
          <Lock size={14} /> Admin {item.label.toLowerCase()}:{' '}
          {item.hint ? <span>{item.value}</span> : <code>{item.value}</code>}
        </p>
      ))}
    </div>
  );
}
