import html2canvas from 'html2canvas';

export function buildShareText(adventureName, rewardName) {
  return `I completed ${adventureName} on Questory and unlocked ${rewardName}. Every city has a story waiting to be found.`;
}

export function createCompletionCertificate({
  adventureId,
  adventureName,
  rewardName,
  completedAt,
  sponsorInfo,
  collectionName,
}) {
  const completed = completedAt || new Date().toISOString();
  const sponsor = sponsorInfo || { name: '', logoUrl: '', website: '' };
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
    shareText: buildShareText(adventureName, rewardName),
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
