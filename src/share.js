import html2canvas from 'html2canvas';

export function buildShareText(adventureName, rewardName) {
  return `I completed ${adventureName} on Questory and unlocked ${rewardName}. Every city has a story waiting to be found.`;
}

export function buildThemedShareText(adventureOrName, rewardName = '') {
  const adventure =
    typeof adventureOrName === 'string' ? { title: adventureOrName } : adventureOrName || {};
  const title = adventure.title || adventure.adventureName || 'an adventure';
  const lower = title.toLowerCase();
  const template = adventure.adventureTemplate || adventure.template;
  const collectionId = adventure.collectionId;

  if (lower.includes('whispering hollow')) {
    return 'I survived The Whispering Hollow. 👻';
  }
  if (lower.includes('black lantern')) {
    return 'I found the Black Lantern. 🕯️';
  }
  if (lower.includes('forgotten souls') || collectionId === 'forgotten-souls') {
    return 'I completed Forgotten Souls.';
  }
  if (lower.includes('midnight train')) {
    return `I survived ${title}. 🚂`;
  }
  if (template === 'horror' || adventure.toolkit === 'horror') {
    return `I survived ${title}. Every city has a story waiting to be found.`;
  }
  return buildShareText(title, rewardName);
}

export function formatCompletionDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'Under 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function createCompletionCertificate({
  adventureId,
  adventureName,
  rewardName,
  completedAt,
  sponsorInfo,
  collectionName,
  adventure = null,
  startedAt = null,
  medallions = [],
}) {
  const completed = completedAt || new Date().toISOString();
  const sponsor = sponsorInfo || { name: '', logoUrl: '', website: '' };
  const shareAdventure = adventure || { title: adventureName, collectionName };
  return {
    id: `cert-${adventureId}`,
    kind: 'certificate',
    adventureId,
    adventureName,
    rewardName,
    collectionName: collectionName || '',
    type: 'certificate',
    completedAt: completed,
    claimedAt: completed,
    startedAt: startedAt || null,
    completionTime: formatCompletionDuration(startedAt, completed),
    medallions: Array.isArray(medallions) ? medallions : [],
    shareText: buildThemedShareText(shareAdventure, rewardName),
    verified: true,
    status: 'verified',
    sponsorName: sponsor.name || '',
    sponsorLogoUrl: sponsor.logoUrl || '',
    sponsorWebsite: sponsor.website || '',
  };
}

export function formatProofDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function downloadProofCard(element, filename = 'questory-proof.png') {
  const canvas = await html2canvas(element, {
    backgroundColor: '#070f18',
    scale: 2,
    useCORS: true,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function downloadSocialCard(element, filename = 'questory-social.png') {
  return downloadProofCard(element, filename);
}

export function printCertificate(element) {
  if (!element) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>Questory Certificate</title>
    <style>body{font-family:Georgia,serif;padding:40px;background:#070f18;color:#f5e6c8;}</style>
    </head><body>${element.outerHTML}</body></html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export async function copyShareText(text) {
  await navigator.clipboard.writeText(text);
}
