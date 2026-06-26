import {
  extractQuotedDialogue,
  looksTruncatedDialogue,
  repairOverlayDialogue,
  sanitizeDialogueField,
} from '../src/dialogueExtract.js';

const cases = [
  {
    prompt: 'A ghost girl appears beside the swing and whispers, "Don\'t look back."',
    expect: "Don't look back.",
  },
  {
    prompt: "A ghost girl appears beside the swing and whispers, 'Don't look back.'",
    expect: "Don't look back.",
  },
  {
    prompt: 'A shadow figure stands beneath the tree. The radio crackles: "You\'re too late."',
    expect: "You're too late.",
  },
];

let failed = 0;
for (const { prompt, expect } of cases) {
  const got = extractQuotedDialogue(prompt);
  const ok = got === expect;
  if (!ok) {
    failed += 1;
    console.error('FAIL:', prompt.slice(0, 50));
    console.error('  expected:', expect);
    console.error('  got:', got);
  } else {
    console.log('OK:', expect);
  }
}

const repaired = repairOverlayDialogue(
  'Don',
  'A ghost girl appears beside the swing and whispers, "Don\'t look back."'
);
if (repaired !== "Don't look back.") {
  failed += 1;
  console.error('FAIL repair:', repaired);
} else {
  console.log('OK repair truncated Don -> full quote');
}

if (looksTruncatedDialogue('Don') !== true) {
  failed += 1;
  console.error('FAIL looksTruncatedDialogue');
}

process.exit(failed ? 1 : 0);
