import { usesFinderGps } from './finderMode';
import { safeMessage } from './stability';

export { safeMessage };

export const CLAIM_METHOD = {
  SECRET_CODE: 'secret_code',
  TAP_MEDALLION: 'tap_medallion',
  QR_CODE: 'qr_code',
  HYBRID: 'hybrid',
  PHYSICAL_MEDALLION: 'physical_medallion',
};

export const CLAIM_METHOD_OPTIONS = [
  {
    value: CLAIM_METHOD.SECRET_CODE,
    label: 'Secret code',
    desc: 'Player completes clues and enters a final claim code.',
    icon: '🔐',
  },
  {
    value: CLAIM_METHOD.TAP_MEDALLION,
    label: 'Virtual medallion',
    desc: 'Finder Mode → tap the virtual medallion to auto-claim.',
    icon: '🥇',
  },
  {
    value: CLAIM_METHOD.QR_CODE,
    label: 'QR code',
    desc: 'Player scans a sponsor QR code at the finish line.',
    icon: '📱',
  },
  {
    value: CLAIM_METHOD.HYBRID,
    label: 'Hybrid',
    desc: 'Finder Mode → tap medallion, then enter the final claim code.',
    icon: '🔀',
  },
  {
    value: CLAIM_METHOD.PHYSICAL_MEDALLION,
    label: 'Physical medallion',
    desc: 'Finder Mode → tap signal, search for a hidden physical medallion, enter engraved code.',
    icon: '📍',
  },
];

export function normalizeClaimMethod(method) {
  const value = String(method || CLAIM_METHOD.SECRET_CODE).toLowerCase();

  if (
    value === 'tap_medallion' ||
    value === 'tap_virtual_medallion' ||
    value === 'virtual_medallion'
  ) {
    return CLAIM_METHOD.TAP_MEDALLION;
  }

  if (value === 'physical') {
    return CLAIM_METHOD.PHYSICAL_MEDALLION;
  }

  const allowed = Object.values(CLAIM_METHOD);
  return allowed.includes(value) ? value : CLAIM_METHOD.SECRET_CODE;
}

export function claimMethodLabel(method) {
  return (
    CLAIM_METHOD_OPTIONS.find((o) => o.value === normalizeClaimMethod(method))?.label ||
    'Secret code'
  );
}

/** Finder Mode is required for tap, hybrid, and physical medallion claims. */
export function claimMethodUsesFinder(adventure) {
  const method = normalizeClaimMethod(adventure?.claimMethod);
  return (
    method === CLAIM_METHOD.TAP_MEDALLION ||
    method === CLAIM_METHOD.HYBRID ||
    method === CLAIM_METHOD.PHYSICAL_MEDALLION
  );
}

/** @deprecated use claimMethodUsesFinder */
export function usesFinderMode(adventure) {
  return claimMethodUsesFinder(adventure) && usesFinderGps(adventure);
}

export function requiresMedallionTap(adventure) {
  return claimMethodUsesFinder(adventure);
}

export function autoClaimsOnTap(adventure) {
  return normalizeClaimMethod(adventure?.claimMethod) === CLAIM_METHOD.TAP_MEDALLION;
}

export function isPhysicalMedallionClaim(adventure) {
  return normalizeClaimMethod(adventure?.claimMethod) === CLAIM_METHOD.PHYSICAL_MEDALLION;
}

/** Whether the player can enter a secret/hybrid claim code yet. */
export function canShowClaimCodeEntry(adventure, progress) {
  const method = normalizeClaimMethod(adventure?.claimMethod);
  if (method === CLAIM_METHOD.SECRET_CODE || method === CLAIM_METHOD.QR_CODE) return true;
  if (method === CLAIM_METHOD.HYBRID || method === CLAIM_METHOD.PHYSICAL_MEDALLION) {
    return Boolean(progress?.medallionTapped);
  }
  return false;
}

/** Player-facing hint for where to find the secret claim code (never the code itself). */
export function getClaimCodeDiscoveryHint(adventure, state) {
  if (adventure?.claimHint?.trim()) return adventure.claimHint.trim();

  const clues = Array.isArray(adventure?.clues) ? adventure.clues : [];
  const lastClue = clues[clues.length - 1];
  if (lastClue?.claimCodeHint) return lastClue.claimCodeHint;

  const questCode =
    adventure?.questCode ||
    state?.growth?.questCodes?.[adventure?.id] ||
    state?.growth?.activeQuestCode;
  if (questCode) {
    return `Your adventure invite includes quest code "${questCode}" — use what you learned on the trail to form the final claim code.`;
  }

  if (lastClue?.title) {
    return `Revisit "${lastClue.title}" and your final discoveries — the claim code is woven into the story.`;
  }

  return 'Re-read the final clue and your adventure invite. The claim code is hidden in what you discovered along the trail.';
}

export function getTreasureClaimStep(adventure, progress) {
  const method = normalizeClaimMethod(adventure?.claimMethod);
  if (progress?.claimed) return 'claimed';
  if (method === CLAIM_METHOD.TAP_MEDALLION) {
    if (progress?.medallionTapped) return 'auto_claim_pending';
    return 'finder_required';
  }
  if (claimMethodUsesFinder(adventure) && !progress?.medallionTapped) return 'finder_required';
  if (method === CLAIM_METHOD.QR_CODE) return 'qr_scan';
  if (method === CLAIM_METHOD.PHYSICAL_MEDALLION) return 'physical_code';
  if (method === CLAIM_METHOD.HYBRID) return 'hybrid_code';
  return 'secret_code';
}

export function getClaimFieldConfig(method) {
  const m = normalizeClaimMethod(method);
  return {
    showFinalClaimCode:
      m === CLAIM_METHOD.SECRET_CODE || m === CLAIM_METHOD.HYBRID,
    showQrClaimValue: m === CLAIM_METHOD.QR_CODE,
    showPhysicalCode: m === CLAIM_METHOD.PHYSICAL_MEDALLION,
    showHintAfterTap: m === CLAIM_METHOD.PHYSICAL_MEDALLION,
    requiresFinalClaimCode:
      m === CLAIM_METHOD.SECRET_CODE || m === CLAIM_METHOD.HYBRID,
    requiresQrClaimValue: m === CLAIM_METHOD.QR_CODE,
    requiresPhysicalCode: m === CLAIM_METHOD.PHYSICAL_MEDALLION,
  };
}

export function validateAdventureClaimFields(meta) {
  const fields = getClaimFieldConfig(meta.claimMethod);
  if (fields.requiresFinalClaimCode && !meta.claimCode?.trim()) {
    return 'Final Claim Code is required for this claim method.';
  }
  if (fields.requiresQrClaimValue && !meta.qrClaimValue?.trim()) {
    return 'QR Claim Value is required for QR code claims.';
  }
  if (fields.requiresPhysicalCode && !meta.physicalMedallionCode?.trim()) {
    return 'Physical Medallion Code is required for physical medallion claims.';
  }
  return null;
}

export function buildAdventureClaimFields(meta) {
  const method = normalizeClaimMethod(meta.claimMethod);
  const claimCode = (meta.claimCode?.trim() || '').toUpperCase();
  const qrClaimValue = (meta.qrClaimValue?.trim() || '').toUpperCase();
  const physicalMedallionCode = (meta.physicalMedallionCode?.trim() || '').toUpperCase();
  const hintAfterTap = meta.hintAfterTap?.trim() || '';

  return {
    claimMethod: method,
    claimCode:
      method === CLAIM_METHOD.TAP_MEDALLION ? claimCode || 'TAP-CLAIM' : claimCode,
    qrClaimValue,
    physicalMedallionCode:
      method === CLAIM_METHOD.PHYSICAL_MEDALLION ? physicalMedallionCode : '',
    hintAfterTap: method === CLAIM_METHOD.PHYSICAL_MEDALLION ? hintAfterTap : '',
  };
}

export function validateClaimAttempt(
  adventure,
  progress,
  { code = '', medallionTapped = false } = {}
) {
  const method = normalizeClaimMethod(adventure.claimMethod);
  const tapped = medallionTapped || progress.medallionTapped;
  const entered = (code || '').trim().toUpperCase();

  if (method === CLAIM_METHOD.SECRET_CODE) {
    const expected = (adventure.claimCode || '').toUpperCase();
    if (entered !== expected) {
      return { ok: false, message: 'Wrong code. Try again.' };
    }
    return { ok: true, code: expected };
  }

  if (method === CLAIM_METHOD.TAP_MEDALLION) {
    if (!tapped) {
      return { ok: false, message: 'Tap the virtual medallion in Finder Mode first.' };
    }
    return { ok: true, code: adventure.claimCode };
  }

  if (method === CLAIM_METHOD.QR_CODE) {
    const expected = (adventure.qrClaimValue || '').toUpperCase();
    if (entered !== expected) {
      return { ok: false, message: 'Invalid QR code. Scan the sponsor QR to claim.' };
    }
    return { ok: true, code: adventure.claimCode };
  }

  if (method === CLAIM_METHOD.HYBRID) {
    if (!tapped) {
      return { ok: false, message: 'Tap the virtual medallion in Finder Mode first.' };
    }
    const expected = (adventure.claimCode || '').toUpperCase();
    if (entered !== expected) {
      return { ok: false, message: 'Wrong code. Try again.' };
    }
    return { ok: true, code: expected };
  }

  if (method === CLAIM_METHOD.PHYSICAL_MEDALLION) {
    if (!tapped) {
      return { ok: false, message: 'Tap the virtual medallion signal in Finder Mode first.' };
    }
    const expected = (adventure.physicalMedallionCode || '').toUpperCase();
    if (entered !== expected) {
      return { ok: false, message: 'Wrong physical medallion code. Check the engraving.' };
    }
    return { ok: true, code: adventure.claimCode };
  }

  return { ok: false, message: 'Unknown claim method.' };
}

export function formatUserErrorMessage(error) {
  return safeMessage(error, 'Something went wrong.');
}

export function formatSuccessMessage(result, fallback = 'Success!') {
  if (!result) return fallback;
  const msg = result.message;
  if (msg && msg !== 'undefined') return msg;
  return fallback;
}

/** Await sync or async claim handlers; show alert only on failure. */
export async function handleClaimResponse(onClaim, payload) {
  try {
    const result = await Promise.resolve(onClaim(payload));
    if (!result) {
      alert('Something went wrong.');
      return null;
    }
    const failed =
      result.ok === false || (result.success === false && result.ok !== true);
    if (failed) {
      alert(formatUserErrorMessage(result));
      return result;
    }
    return result;
  } catch (error) {
    alert(formatUserErrorMessage(error));
    return null;
  }
}

export function getAdminClaimSecrets(adventure) {
  const method = normalizeClaimMethod(adventure.claimMethod);
  const secrets = [];
  if (
    method === CLAIM_METHOD.SECRET_CODE ||
    method === CLAIM_METHOD.HYBRID
  ) {
    secrets.push({ label: 'Final claim code', value: adventure.claimCode });
  }
  if (method === CLAIM_METHOD.QR_CODE) {
    secrets.push({ label: 'QR claim value', value: adventure.qrClaimValue });
  }
  if (method === CLAIM_METHOD.PHYSICAL_MEDALLION) {
    secrets.push({
      label: 'Physical medallion code',
      value: adventure.physicalMedallionCode,
    });
    if (adventure.hintAfterTap) {
      secrets.push({ label: 'Hint after tap', value: adventure.hintAfterTap, hint: true });
    }
  }
  return secrets;
}
