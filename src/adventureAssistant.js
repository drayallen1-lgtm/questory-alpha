import { generateClaimCode } from './seed';
import {
  ADVENTURE_TEMPLATES,
  TEMPLATE_META,
  applySmartBuilderConfig,
  buildTemplateClues,
  buildTemplateRewards,
  buildTemplateStory,
  getScalePreset,
  getTemplateMeta,
} from './templates';

const ASSISTANT_PATTERNS = [
  {
    match: /scary|horror|ghost|spooky/i,
    template: ADVENTURE_TEMPLATES.HORROR,
    scale: 'backyard',
    title: 'Backyard Ghost Hunt',
    story: 'Something stirs after dark in the backyard. Follow whispers, find the lantern, survive the trail.',
  },
  {
    match: /family|kids|grandpa|birthday/i,
    template: ADVENTURE_TEMPLATES.FAMILY_FUN,
    scale: 'backyard',
    title: 'Family Backyard Treasure',
    story: 'Grandpa hid a treasure somewhere in the yard. Work together — each clue brings you closer.',
  },
  {
    match: /church|bible|faith|youth|easter/i,
    template: ADVENTURE_TEMPLATES.CHURCH,
    scale: 'neighborhood',
    title: 'Scripture Scavenger Hunt',
    story: 'Walk the path of faith. Each stop unlocks scripture and a blessing for your group.',
  },
  {
    match: /school|teacher|education|museum|history/i,
    template: ADVENTURE_TEMPLATES.EDUCATIONAL,
    scale: 'city',
    title: 'Learning Trail Quest',
    story: 'Explore history and science on this educational adventure built for curious minds.',
  },
  {
    match: /date|romantic|couple|anniversary/i,
    template: ADVENTURE_TEMPLATES.DATE_NIGHT,
    scale: 'neighborhood',
    title: 'Date Night Adventure',
    story: 'A trail of memories and surprises awaits. Take your time and enjoy every moment together.',
  },
  {
    match: /sponsor|coupon|business|store|promotion/i,
    template: ADVENTURE_TEMPLATES.SPONSOR,
    scale: 'city',
    title: 'Sponsor Discovery Hunt',
    story: 'Visit local landmarks and unlock exclusive sponsor rewards along the way.',
  },
];

export function generateAdventureFromPrompt(prompt, options = {}) {
  const text = String(prompt || '').trim();
  if (!text) {
    return { ok: false, message: 'Describe the adventure you want to create.' };
  }

  let match = ASSISTANT_PATTERNS.find((p) => p.match.test(text));
  if (!match) {
    match = {
      template: ADVENTURE_TEMPLATES.SCRATCH,
      scale: 'neighborhood',
      title: 'Custom Questory Adventure',
      story: `An adventure inspired by: "${text.slice(0, 120)}"`,
    };
  }

  const template = getTemplateMeta(match.template);
  const config = applySmartBuilderConfig({
    templateId: match.template,
    scaleId: match.scale,
    players: options.players || '3-5',
    durationMin: options.durationMin || '15',
    environment: options.environment || 'outdoor',
  });

  const scale = getScalePreset(config.adventureScale);
  const clues = buildTemplateClues(match.template, config.clueCount);
  const rewardTemplates = buildTemplateRewards(match.template);

  const meta = {
    title: match.title,
    location: options.location || 'Your Backyard',
    sponsorName: options.sponsorName || 'Questory Creator',
    story: match.story || buildTemplateStory(match.template, match.title),
    claimCode: generateClaimCode(),
    estimatedMinutes: config.estimatedMinutes,
    adventureScale: config.adventureScale,
    adventureTemplate: config.adventureTemplate,
    finderSearchRadiusM: config.finderSearchRadiusM,
    finderCaptureBaseM: config.finderCaptureBaseM,
    experienceSettings: config.experienceSettings,
  };

  const rewards = rewardTemplates.map((r, i) => ({
    type: r.type,
    enabled: true,
    icon: r.icon,
    title: r.title,
    desc: r.desc,
    valueLabel: r.valueLabel,
    redemptionInstructions: r.redemptionInstructions,
    expirationDays: String(r.expirationDays || 0),
    quantityLimit: null,
    claimedCount: 0,
    rewardPolicy: 'continue_badge_coins_only',
  }));

  return {
    ok: true,
    meta,
    clues,
    rewards,
    summary: `Generated a ${template.label} adventure with ${clues.length} clues at ${scale.label} scale.`,
  };
}

export function getAssistantSuggestions() {
  return [
    'Help me create a scary backyard hunt for my kids',
    'Family treasure hunt for grandparents visiting',
    'Church youth group Easter scavenger hunt',
    'Educational history trail for my classroom',
    'Romantic date night adventure in the park',
    'Sponsor promotion hunt with coupon reward',
  ];
}

export function refineAssistantDraft(draft, instruction) {
  if (!draft?.ok) return draft;
  const lower = instruction.toLowerCase();
  const next = { ...draft, meta: { ...draft.meta }, clues: [...draft.clues] };

  if (/scarier|creepier|terrifying/i.test(lower)) {
    next.meta.experienceSettings = {
      ...next.meta.experienceSettings,
      atmosphere: 'terrifying',
      soundEffects: ['whispers', 'footsteps', 'static'],
    };
    next.summary = 'Made the atmosphere more terrifying with sound effects.';
  }
  if (/easier|simpler|younger/i.test(lower)) {
    next.clues = next.clues.slice(0, Math.max(2, next.clues.length - 1));
    next.meta.estimatedMinutes = Math.max(10, (next.meta.estimatedMinutes || 15) - 5);
    next.summary = 'Simplified clues and shortened estimated time for younger players.';
  }
  if (/longer|more clues/i.test(lower)) {
    const extra = buildTemplateClues(next.meta.adventureTemplate, 1);
    next.clues = [...next.clues, ...extra];
    next.summary = 'Added an extra clue to extend the adventure.';
  }

  return next;
}
