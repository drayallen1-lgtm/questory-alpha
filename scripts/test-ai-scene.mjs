import { generateSceneFromPrompt } from '../src/aiSceneGenerator.js';

const prompts = [
  'A ghost girl appears beside the swing and whispers, "Don\'t look back."',
  'A shadow figure stands beneath the tree. Branches move above him. The radio crackles: "You\'re too late."',
];

for (const p of prompts) {
  const r = generateSceneFromPrompt(p);
  console.log('\n---');
  console.log('overlay:', r.ok ? r.overlayText : r.message);
  console.log('title:', r.ok ? r.title : '');
}
