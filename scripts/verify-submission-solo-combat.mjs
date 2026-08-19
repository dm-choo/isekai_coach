import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_SOLO_COMBAT_PORT ?? 4187);
const baseUrl = `http://127.0.0.1:${port}/?verify=1`;
const artifactDir = new URL('../artifacts/submission-solo-combat/', import.meta.url);
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
  const readiness = await verifyDelayedReadiness(browser, baseUrl, artifactDir);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  observeErrors(page, errors);

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await enterSoloCombat(page);
  await page.waitForTimeout(520);
  const threat = await combatSnapshot(page);
  assertSoloState(threat, { planned: 0, authoritativeX: 3, previewX: 3 });
  await expectCount(page, '.intent-stack.is-learning-focus .enemy-intent-card', 1, 'focused enemy intent');
  await expectCount(page, '.solo-combat-guide.is-threat[data-learning-phase="THREAT"]', 1, 'threat guide');
  await expectCount(page, '.solo-learning-controls.is-threat .movement-control', 1, 'contextual movement');
  await expectCount(page, '.solo-learning-controls .skill-button,.solo-learning-controls .plan-strip,[data-onboarding-primary]', 0, 'hidden later vocabulary');
  await assertCriticalFit(page, ['.intent-stack.is-learning-focus', '.solo-combat-guide', '.solo-learning-controls']);
  await page.screenshot({ path: new URL('00-threat.png', artifactDir).pathname });

  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'A' }).click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.inputFeedback?.kind === 'ACCEPTED');
  const unsafeOutcome = await combatSnapshot(page);
  assertSoloState(unsafeOutcome, { planned: 1, authoritativeX: 3, previewX: 2, authoritativeY: 1, previewY: 1 });
  await expectCount(page, '.solo-combat-guide', 0, 'retired threat guide');
  await expectCount(page, '.solo-learning-controls.is-outcome .movement-control,.solo-learning-controls .skill-button,.solo-learning-controls .plan-strip', 0, 'resolved input vocabulary');
  await expectCount(page, '.solo-outcome-controls.is-unsafe[data-outcome-safety="UNSAFE"]', 1, 'unsafe recomputed outcome');
  await expectCount(page, '[data-onboarding-primary="revise-plan"]', 1, 'single revise action');
  await expectCount(page, '[data-onboarding-primary="execute-plan"]', 0, 'locked unsafe execution');
  if (!await page.locator('.solo-input-feedback.is-accepted').isVisible()) throw new Error('Accepted movement has no immediate feedback');
  await page.keyboard.press('Space');
  const afterBlockedSpace = await combatSnapshot(page);
  if (afterBlockedSpace.mode !== 'PLAYER_TURN' || afterBlockedSpace.plannedActions.length !== 1) throw new Error('Unsafe first plan was executed');
  await assertCriticalFit(page, ['.intent-stack.is-learning-focus', '.solo-learning-controls', '[data-onboarding-primary="revise-plan"]']);
  await page.screenshot({ path: new URL('01-unsafe-outcome.png', artifactDir).pathname });

  await page.locator('[data-onboarding-primary="revise-plan"]').click();
  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' }).click();
  await page.waitForFunction(() => document.querySelector('.solo-outcome-controls.is-safe[data-outcome-safety="SAFE"]'));
  const outcome = await combatSnapshot(page);
  assertSoloState(outcome, { planned: 1, authoritativeX: 3, previewX: 3, authoritativeY: 1, previewY: 0 });
  await expectCount(page, '[data-onboarding-primary="execute-plan"]', 1, 'single execute action');
  await expectCount(page, '[data-onboarding-primary="revise-plan"]', 0, 'retired unsafe action');
  await assertCriticalFit(page, ['.intent-stack.is-learning-focus', '.solo-learning-controls', '[data-onboarding-primary="execute-plan"]']);
  await page.screenshot({ path: new URL('02-safe-outcome.png', artifactDir).pathname });

  const textOffStyle = await page.addStyleTag({ content: '.slice2-unit-bar > span,.intent-sequence b,.solo-input-feedback span{visibility:hidden!important}' });
  await page.screenshot({ path: new URL('03-safe-outcome-text-off.png', artifactDir).pathname });
  await textOffStyle.evaluate((element) => element.remove());

  await page.locator('[data-onboarding-primary="execute-plan"]').click();
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && snapshot.state.turn >= 2 && !snapshot.isBusy;
  });
  const learned = await combatSnapshot(page);
  if (learned.state.turn < 2 || learned.mode !== 'PLAYER_TURN') throw new Error('First plan did not execute into the next player turn');
  const learnedAdministrator = learned.state.units.find((unit) => unit.id === 'administrator-slice2');
  if (learnedAdministrator?.hp !== 14) throw new Error(`Safe preview did not match resolution: HP ${learnedAdministrator?.hp}/14`);
  await expectCount(page, '.solo-combat-guide,.solo-learning-controls', 0, 'retired first-turn guide');
  await expectCount(page, '.player-controls:not(.solo-learning-controls) .skill-button', 3, 'full combat actions');
  await expectCount(page, '.player-controls:not(.solo-learning-controls) .plan-strip', 1, 'full plan strip');
  await page.screenshot({ path: new URL('04-full-controls.png', artifactDir).pathname });

  const compactPage = await browser.newPage({ viewport: { width: 960, height: 720 } });
  observeErrors(compactPage, errors);
  await compactPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await enterSoloCombat(compactPage);
  await compactPage.waitForTimeout(520);
  await assertCriticalFit(compactPage, ['.intent-stack.is-learning-focus', '.solo-combat-guide', '.solo-learning-controls']);
  const compactOverflow = await compactPage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (compactOverflow !== 0) throw new Error(`Compact first combat horizontally overflows by ${compactOverflow}px`);
  await compactPage.screenshot({ path: new URL('05-threat-4x3.png', artifactDir).pathname });
  await compactPage.close();

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  const report = {
    status: 'SOLO_COMBAT_INTERACTION_PASS',
    readiness,
    viewport: { width: 1280, height: 720 },
    threat: { focusedIntent: 1, visibleVocabulary: ['enemy intent', 'world telegraph', 'movement'] },
    unsafeOutcome: { preview: { x: 2, y: 1 }, primaryAction: 'Z', spaceLocked: true },
    safeOutcome: { plannedActions: outcome.plannedActions.length, authoritative: { x: 3, y: 1 }, preview: { x: 3, y: 0 }, primaryAction: 'SPACE', acceptedFeedback: true },
    transfer: { turn: learned.state.turn, administratorHp: learnedAdministrator.hp, fullSkillCount: 3, guideRetired: true },
    textOffFrameCaptured: true,
    compactViewport: { width: 960, height: 720, horizontalOverflow: 0 },
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function enterSoloCombat(page) {
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'INTRO');
  await page.locator('[data-combat-presentation="READY"]').waitFor();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && snapshot.state.turn === 1 && !snapshot.isBusy;
  });
}

async function verifyDelayedReadiness(browser, url, artifactDirectory) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  observeErrors(page, errors);
  await page.route(/(?:PhaserCanvas\.tsx|phaser(?:\.esm)?\.js|frontier-combat-v1\.png|ground-atlas-v1\.png)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-submission-primary="advance-prologue"]').waitFor();
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'INTRO');
  const enteredAt = Date.now();
  const stage = page.locator('[data-combat-presentation]');
  if (await stage.getAttribute('data-combat-presentation') !== 'LOADING') throw new Error('Delayed first contact did not expose the readiness gate');
  if (!await page.locator('[data-combat-readiness="LOADING"]').isVisible()) throw new Error('Readiness continuity gate is not visible');
  if (await page.locator('[aria-label="첫 전투 시작"]').isVisible()) throw new Error('Combat primary is visible before presentation readiness');
  const beforeInput = await combatSnapshot(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('a');
  await page.keyboard.press('q');
  await page.mouse.click(640, 650);
  await page.mouse.click(160, 650);
  await page.waitForTimeout(100);
  const afterBlockedInput = await combatSnapshot(page);
  if (JSON.stringify(afterBlockedInput) !== JSON.stringify(beforeInput)) throw new Error('Readiness-gated keyboard or pointer input changed combat state');
  await page.screenshot({ path: new URL('00-readiness-100ms.png', artifactDirectory).pathname });
  await page.waitForTimeout(400);
  if (!await page.locator('[data-combat-readiness="LOADING"]').isVisible()) throw new Error('500ms delayed frame retired the continuity gate too early');
  await page.screenshot({ path: new URL('00-readiness-500ms.png', artifactDirectory).pathname });
  await page.locator('[data-combat-presentation="READY"]').waitFor();
  const readyMs = Date.now() - enteredAt;
  if (await page.locator('[data-combat-readiness]').count() !== 0) throw new Error('Readiness gate remained after Phaser presentation attached');
  if (!await page.locator('[aria-label="첫 전투 시작"]').isVisible()) throw new Error('Combat primary did not appear after presentation readiness');
  await page.screenshot({ path: new URL('00-readiness-ready.png', artifactDirectory).pathname });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && !snapshot.isBusy;
  });
  await page.evaluate(() => {
    window.__P21_INPUT_LATENCY__ = { startedAt: null, feedbackAt: null };
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'a') window.__P21_INPUT_LATENCY__.startedAt = performance.now();
    }, { once: true });
    const sampleFeedback = () => {
      if (window.__P21_INPUT_LATENCY__.startedAt !== null && document.querySelector('.solo-input-feedback.is-accepted')) {
        window.__P21_INPUT_LATENCY__.feedbackAt = performance.now();
        return;
      }
      requestAnimationFrame(sampleFeedback);
    };
    requestAnimationFrame(sampleFeedback);
  });
  await page.keyboard.press('a');
  try {
    await page.waitForFunction(() => window.__P21_INPUT_LATENCY__?.feedbackAt !== null, undefined, { timeout: 2_000 });
  } catch {
    const debug = await page.evaluate(() => ({
      latency: window.__P21_INPUT_LATENCY__,
      inputFeedback: window.__ISEKAI_COACH_COMBAT__?.snapshot.inputFeedback,
      plannedActions: window.__ISEKAI_COACH_COMBAT__?.snapshot.plannedActions,
      presentation: document.querySelector('[data-combat-presentation]')?.getAttribute('data-combat-presentation'),
      feedbackClass: document.querySelector('.solo-input-feedback')?.className,
    }));
    throw new Error(`Ready input did not expose accepted feedback: ${JSON.stringify(debug)}`);
  }
  const inputFeedbackMs = Math.round(await page.evaluate(() => window.__P21_INPUT_LATENCY__.feedbackAt - window.__P21_INPUT_LATENCY__.startedAt));
  if (inputFeedbackMs > 100) throw new Error(`First ready input feedback took ${inputFeedbackMs}ms`);
  if (errors.length) throw new Error(`Delayed readiness browser errors:\n${errors.join('\n')}`);
  await page.close();
  return {
    delayedRequestsMs: 1_500,
    hiddenControlsBeforeReady: true,
    blockedKeyboardAndPointerPreservedState: true,
    continuityFrames: ['100ms', '500ms'],
    combatEntryToReadyMs: readyMs,
    firstInputToFeedbackMs: inputFeedbackMs,
  };
}

function assertSoloState(snapshot, expected) {
  const current = snapshot.state.units.find((unit) => unit.id === 'administrator-slice2');
  const preview = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
  if (snapshot.plannedActions.length !== expected.planned || current?.position.x !== expected.authoritativeX || preview?.position.x !== expected.previewX || (expected.authoritativeY !== undefined && current?.position.y !== expected.authoritativeY) || (expected.previewY !== undefined && preview?.position.y !== expected.previewY)) {
    throw new Error(`Unexpected solo planning state: ${JSON.stringify({ planned: snapshot.plannedActions.length, current: current?.position, preview: preview?.position })}`);
  }
}

async function expectCount(page, selector, expected, label) {
  const count = await page.locator(selector).count();
  if (count !== expected) throw new Error(`${label}: expected ${expected}, got ${count} for ${selector}`);
}

async function assertCriticalFit(page, selectors) {
  const viewport = page.viewportSize();
  const boxes = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Critical control is not visible: ${selector}`);
    if (box.x < 0 || box.y < 0 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
      throw new Error(`Critical control overflows viewport: ${selector} ${JSON.stringify(box)}`);
    }
    boxes.push({ selector, box });
  }
  const intent = boxes.find((entry) => entry.selector.includes('intent-stack'))?.box;
  const controls = boxes.find((entry) => entry.selector === '.solo-learning-controls')?.box;
  if (intent && controls && rectanglesOverlap(intent, controls)) throw new Error('Focused intent overlaps contextual controls');
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function combatSnapshot(page) {
  return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot);
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
