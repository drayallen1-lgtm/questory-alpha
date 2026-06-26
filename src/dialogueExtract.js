/**
 * Dialogue extraction + normalization for AR overlay/subtitle fields.
 * Double-quoted strings preserve apostrophes (e.g. "Don't look back.").
 */

const VERB_PREFIX =
  /(?:says?|whispers?|murmurs?|cries?|screams?|speaks?|calls?|utters?|crackles?)/i;

/** Preserve text as-is; only trim — never strip apostrophes. */
export function sanitizeDialogueField(value) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function extractDoubleQuoted(raw) {
  const matches = [...String(raw).matchAll(/"([^"]{1,300})"/g)];
  if (!matches.length) return '';
  return matches[matches.length - 1][1].trim();
}

function extractSingleQuotedAfterVerb(raw) {
  const match = String(raw).match(
    new RegExp(`${VERB_PREFIX.source}[,:\\s]*'(.+)'`, 'i')
  );
  return match?.[1]?.trim() || '';
}

function extractSingleQuotedBalanced(raw) {
  const text = String(raw);
  const start = text.indexOf("'");
  const end = text.lastIndexOf("'");
  if (start < 0 || end <= start) return '';
  const inner = text.slice(start + 1, end).trim();
  return inner.length >= 2 ? inner : '';
}

function extractAfterVerbUnquoted(raw) {
  const match = String(raw).match(
    new RegExp(`${VERB_PREFIX.source}[,:\\s]+(.+?)(?:[.!?]\\s*$)`, 'i')
  );
  if (!match?.[1]) return '';
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function extractRadioDoubleQuoted(raw) {
  const match = String(raw).match(/(?:radio|static|signal)[^:]*:\s*"([^"]{1,300})"/i);
  return match?.[1]?.trim() || '';
}

function extractRadioUnquoted(raw) {
  const match = String(raw).match(/(?:radio|static|signal)[^:]*:\s*(.+?)(?:[.!?]\s*$)/i);
  if (!match?.[1]) return '';
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/** Extract spoken dialogue from a creator prompt — prefers double-quoted strings. */
export function extractQuotedDialogue(prompt) {
  const raw = String(prompt || '');
  if (!raw.trim()) return '';

  const double = extractDoubleQuoted(raw);
  if (double) return double;

  const verbDouble = raw.match(
    new RegExp(`${VERB_PREFIX.source}[,:\\s]*"([^"]{1,300})"`, 'i')
  );
  if (verbDouble?.[1]) return verbDouble[1].trim();

  const verbSingle = extractSingleQuotedAfterVerb(raw);
  if (verbSingle) return verbSingle;

  const radioDouble = extractRadioDoubleQuoted(raw);
  if (radioDouble) return radioDouble;

  const balancedSingle = extractSingleQuotedBalanced(raw);
  if (balancedSingle && balancedSingle.includes(' ')) return balancedSingle;

  const verbPlain = extractAfterVerbUnquoted(raw);
  if (verbPlain) return verbPlain;

  const radioPlain = extractRadioUnquoted(raw);
  if (radioPlain) return radioPlain;

  return '';
}

/** Detect dialogue truncated by naive single-quote splitting (e.g. "Don" from "Don't"). */
export function looksTruncatedDialogue(text) {
  const t = sanitizeDialogueField(text);
  if (!t) return false;
  if (t.length <= 4 && /^[A-Za-z]+$/.test(t)) return true;
  if (/^[A-Z][a-z]{1,3}$/.test(t)) return true;
  return false;
}

/**
 * Repair overlay/subtitle from description or full prompt when stored value was truncated.
 * Lower cinematic subtitle uses overlayText — this ensures it matches quoted dialogue.
 */
export function repairOverlayDialogue(overlayText, description, prompt = '') {
  const overlay = sanitizeDialogueField(overlayText);
  if (!looksTruncatedDialogue(overlay)) return overlay;

  for (const source of [description, prompt]) {
    if (!source) continue;
    const extracted = extractQuotedDialogue(source);
    if (extracted && extracted.length > overlay.length) return extracted;
    const dq = String(source).match(/"([^"]+)"/);
    if (dq?.[1] && dq[1].startsWith(overlay) && dq[1].length > overlay.length) {
      return dq[1].trim();
    }
  }

  return overlay;
}

export function normalizeSceneDialogueFields(scene = {}, prompt = '') {
  const description = sanitizeDialogueField(scene.description);
  const overlayText = repairOverlayDialogue(scene.overlayText, description, prompt);
  const revealText = sanitizeDialogueField(scene.revealText);
  return { description, overlayText, revealText };
}
