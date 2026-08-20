import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_INTERACTION_PORT ?? 4184);
const baseUrl = `http://127.0.0.1:${port}/?verify=1`;
const submissionSaveKey = 'isekai-coach:submission:v3';
const legacySubmissionSaveKey = 'isekai-coach:submission:v2';
const artifactDir = new URL('../artifacts/submission-interaction/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  server = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], {
    env: { ...process.env, VITE_SLICE: 'submission' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(baseUrl, server);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = [];
  observeErrors(page, errors);

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  if (await page.title() !== '결계의 바깥') throw new Error(`Unexpected title: ${await page.title()}`);
  await assertPrimary(page, 'advance-prologue', 'D');
  if (await page.locator('.submission-prologue h1,.submission-prologue p,.submission-topbar,img[alt="원거리 동료"]').count()) {
    throw new Error('Opening leaks explanatory copy, party HUD, or the future companion');
  }
  const hold = page.locator('[data-submission-primary="advance-prologue"]');
  await hold.dispatchEvent('pointerdown');
  await page.waitForTimeout(120);
  await hold.dispatchEvent('pointerup');
  const pointerState = await submissionSnapshot(page);
  if (pointerState.prologueProgress <= 0 || pointerState.mode !== 'SOLO_APPROACH') {
    throw new Error(`Pointer hold produced no visible travel feedback: ${JSON.stringify(pointerState)}`);
  }
  await page.screenshot({ path: new URL('01-pointer-feedback.png', artifactDir).pathname });

  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('d');
  const keyboardState = await submissionSnapshot(page);
  if (keyboardState.prologueProgress <= 0 || keyboardState.mode !== 'SOLO_APPROACH') {
    throw new Error(`Keyboard input produced no visible travel feedback: ${JSON.stringify(keyboardState)}`);
  }

  const persistencePage = await browser.newPage({ viewport: { width: 960, height: 720 } });
  observeErrors(persistencePage, errors);
  await persistencePage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await persistencePage.keyboard.press('d');
  await persistencePage.waitForFunction(({ currentKey, legacyKey }) => JSON.parse(localStorage.getItem(currentKey) ?? localStorage.getItem(legacyKey) ?? 'null')?.prologueProgress === 5, { currentKey: submissionSaveKey, legacyKey: legacySubmissionSaveKey });
  await persistencePage.reload({ waitUntil: 'networkidle' });
  await persistencePage.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.prologueProgress === 5);
  const restoredState = await submissionSnapshot(persistencePage);
  if (restoredState.mode !== 'SOLO_APPROACH' || restoredState.worldTime !== '10:00' || restoredState.companionJoined) {
    throw new Error(`Stable checkpoint did not restore with visible autosave state: ${JSON.stringify(restoredState)}`);
  }
  await persistencePage.screenshot({ path: new URL('02-restored-checkpoint.png', artifactDir).pathname });
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    status: 'PASS',
    title: await page.title(),
    viewport: { width: 960, height: 720 },
    opening: { textIndependent: true, solo: true, primaryAction: 'advance-prologue' },
    pointer: { mode: pointerState.mode, progress: pointerState.prologueProgress, notice: pointerState.notice },
    keyboard: { mode: keyboardState.mode, progress: keyboardState.prologueProgress, notice: keyboardState.notice },
    persistence: { mode: restoredState.mode, progress: restoredState.prologueProgress, worldTime: restoredState.worldTime, checkpointStored: true },
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function assertPrimary(page, id, key) {
  const actions = page.locator('[data-submission-primary]');
  if (await actions.count() !== 1) throw new Error(`Expected one primary action, found ${await actions.count()}`);
  if (await actions.first().getAttribute('data-submission-primary') !== id) throw new Error(`Expected primary action ${id}`);
  if (await actions.first().getAttribute('data-primary-key') !== key) throw new Error(`Expected ${id} key ${key}`);
}

async function submissionSnapshot(page) {
  return page.evaluate(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot);
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited with ${child.exitCode}`);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function observeErrors(page, errors) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request ${request.method()} ${request.url()} ${request.failure()?.errorText}`));
}
