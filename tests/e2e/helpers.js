const STORAGE_KEY = 'questoryAlpha';

const E2E_ONBOARDING = {
  completed: true,
  skipped: true,
  journeyChosen: true,
  playerGuideCompleted: true,
  playerGuideSkipped: true,
};

const E2E_FIRST_TIME_METRICS = {
  firstCompletionCelebrated: true,
  demoCompleted: true,
};

const APP_ROOT_SELECTOR =
  'main.app, [data-testid="app-root"], .questory-shell, nav.bottom-nav-7, nav.bottom-nav-8';

const diagnosedPages = new WeakSet();

export { STORAGE_KEY };

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function attachPageDiagnostics(page) {
  if (diagnosedPages.has(page)) return;
  diagnosedPages.add(page);

  page.on('pageerror', (err) => {
    console.log('PAGE ERROR', err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR', msg.text());
    }
  });
}

async function waitForAppRoot(page, timeout = 30_000) {
  await page.waitForSelector(APP_ROOT_SELECTOR, { timeout, state: 'visible' });
}

async function reloadApp(page, attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.goto('/', { waitUntil: 'load', timeout: 45_000 });
    try {
      await waitForAppRoot(page, 30_000);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        await page.waitForTimeout(500 * attempt);
      }
    }
  }
  throw lastErr;
}

function isOnAppOrigin(page) {
  try {
    const { origin, pathname } = new URL(page.url());
    return (
      (origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5173') &&
      (pathname === '/' || pathname === '')
    );
  } catch {
    return false;
  }
}

export async function primeAppState(page, patch = {}) {
  attachPageDiagnostics(page);

  if (!isOnAppOrigin(page)) {
    await page.goto('/');
  }
  await page.waitForLoadState('domcontentloaded');
  await waitForAppRoot(page).catch(() => {});

  const base = await page.evaluate((storageKey) => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, STORAGE_KEY);

  const merged = deepMerge(base, {
    onboarding: { ...(base.onboarding || {}), ...E2E_ONBOARDING },
    firstTimeMetrics: { ...(base.firstTimeMetrics || {}), ...E2E_FIRST_TIME_METRICS },
    ...patch,
  });

  await page.evaluate(
    ({ storageKey, state }) => {
      localStorage.setItem(storageKey, JSON.stringify(state));
    },
    { storageKey: STORAGE_KEY, state: merged }
  );

  try {
    await reloadApp(page);
  } catch (err) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    throw new Error(
      `App root not visible after primeAppState reload. ${err.message}\nBody preview: ${bodyText.slice(0, 240)}`
    );
  }
}

export async function dismissFirstCompletionOverlay(page) {
  const overlay = page.locator('.first-completion-overlay');
  if (!(await overlay.isVisible().catch(() => false))) return;
  await page.locator('.first-completion-overlay button.ghost').first().click();
  await overlay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
}

export async function dismissPostClaimPrompts(page) {
  const overlays = page.locator('.modal-overlay, .invitation-overlay');
  for (let i = 0; i < 4; i += 1) {
    const count = await overlays.count();
    if (count === 0) break;
    const top = overlays.last();
    const skip = top.getByRole('button', { name: 'Skip' });
    const dismiss = top.locator('button.ghost').first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ force: true });
    } else if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click({ force: true });
    } else {
      break;
    }
    await page.waitForTimeout(400);
  }
}

export async function openPassportAfterClaim(page) {
  await dismissPostClaimPrompts(page);
  await dismissFirstCompletionOverlay(page);
  await page.getByRole('button', { name: /Open Passport/i }).click();
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
