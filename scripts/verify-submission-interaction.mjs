import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_INTERACTION_PORT ?? 4184);
const baseUrl = `http://127.0.0.1:${port}/?verify=1`;
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
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request ${request.method()} ${request.url()} ${request.failure()?.errorText}`));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  if (await page.title() !== '결계의 바깥') throw new Error(`Unexpected title: ${await page.title()}`);
  await assertPrimary(page, 'start-expedition', 'SPACE');
  await page.locator('[data-submission-primary="start-expedition"]').click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');
  await assertPrimary(page, 'advance-corridor', 'D');
  const hold = page.locator('[data-submission-primary="advance-corridor"]');
  await hold.dispatchEvent('pointerdown');
  await page.waitForTimeout(120);
  await hold.dispatchEvent('pointerup');
  const pointerState = await submissionSnapshot(page);
  if (pointerState.corridorProgress <= 0 || !pointerState.notice.includes('전진 중')) {
    throw new Error(`Pointer hold produced no visible travel feedback: ${JSON.stringify(pointerState)}`);
  }
  await page.screenshot({ path: new URL('01-pointer-feedback.png', artifactDir).pathname });

  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');
  await page.keyboard.press('d');
  const keyboardState = await submissionSnapshot(page);
  if (keyboardState.corridorProgress <= 0 || !keyboardState.notice.includes('전진 중')) {
    throw new Error(`Keyboard input produced no visible travel feedback: ${JSON.stringify(keyboardState)}`);
  }
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    status: 'PASS',
    title: await page.title(),
    viewport: { width: 960, height: 720 },
    pointer: { mode: pointerState.mode, progress: pointerState.corridorProgress, notice: pointerState.notice },
    keyboard: { mode: keyboardState.mode, progress: keyboardState.corridorProgress, notice: keyboardState.notice },
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
