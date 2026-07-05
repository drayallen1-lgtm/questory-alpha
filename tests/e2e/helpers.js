const STORAGE_KEY = 'questoryAlpha';

const E2E_ONBOARDING = {
  completed: true,
  skipped: true,
  journeyChosen: true,
  playerGuideCompleted: true,
  playerGuideSkipped: true,
};

export { STORAGE_KEY };

export async function primeAppState(page, patch = {}) {
  await page.goto('/');
  await page.waitForSelector('main.app', { timeout: 30_000 }).catch(() => {});
  await page.evaluate(
    ({ storageKey, onboarding, statePatch }) => {
      try {
        const raw = localStorage.getItem(storageKey);
        const base = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...base,
            onboarding: { ...(base.onboarding || {}), ...onboarding },
            ...statePatch,
            progress: { ...(base.progress || {}), ...(statePatch.progress || {}) },
          })
        );
      } catch {
        localStorage.setItem(storageKey, JSON.stringify({ onboarding, ...statePatch }));
      }
    },
    { storageKey: STORAGE_KEY, onboarding: E2E_ONBOARDING, statePatch: patch }
  );
  await page.reload();
  await page.waitForSelector('main.app', { timeout: 30_000 });
}

export async function gotoScreen(page, screen) {
  await primeAppState(page);
  await page.waitForSelector('nav.bottom-nav-7, nav.bottom-nav-8', { timeout: 30_000 });
  const labelMap = {
    home: 'Home',
    feed: 'Feed',
    map: 'Map',
    vault: 'Passport',
  };
  await page.getByRole('button', { name: labelMap[screen], exact: true }).click();
}
