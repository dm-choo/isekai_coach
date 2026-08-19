import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_ENCOUNTER_PORT ?? 4191);
const baseUrl = `http://127.0.0.1:${port}/?verify=1`;
const artifactDir = new URL('../artifacts/submission-encounter-transition/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  server = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], { env: { ...process.env, VITE_SLICE: 'submission' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await waitForServer(baseUrl, server);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  observeErrors(page, errors);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await enterFirstJointEncounter(page);
  await page.waitForTimeout(500);

  const run = await submissionSnapshot(page);
  if (run.mode !== 'COMBAT' || run.encounterId !== 'FIRST_WARRIOR' || run.corridorProgress !== 200 || run.combat?.mode !== 'INTRO') {
    throw new Error(`Verifier reached the wrong encounter state: ${JSON.stringify({ mode: run.mode, encounter: run.encounterId, progress: run.corridorProgress, combat: run.combat?.mode })}`);
  }
  await expectCount(page, '.slice2-combat.is-encounter-reveal', 1, 'continuous encounter scene');
  await expectCount(page, '.encounter-overlay.is-seamless[data-encounter-transition="THREAT_REVEALED"]', 1, 'threat reveal gate');
  await expectCount(page, '.encounter-title,.encounter-overlay.is-seamless h1,.encounter-overlay.is-seamless p,.encounter-overlay.is-seamless > span:not(.encounter-threat-pulse)', 0, 'blocking title and explanation copy');
  await expectCount(page, '[data-combat-primary="start-encounter"]', 1, 'single encounter start action');
  await expectCount(page, '[data-combat-primary="start-encounter"] img', 1, 'attack icon');
  if (await page.locator('[data-combat-primary="start-encounter"] kbd').innerText() !== 'SPACE') throw new Error('Encounter action does not expose SPACE');
  if (await page.locator('.slice2-party-bars .slice2-unit-bar').count() !== 2 || await page.locator('.enemy-bars .slice2-unit-bar').count() < 1) {
    throw new Error('Encounter reveal does not keep both parties visible');
  }
  await assertCriticalFit(page, ['.slice2-combat', '.encounter-threat-pulse', '[data-combat-primary="start-encounter"]', '.slice2-party-bars', '.enemy-bars']);
  await page.screenshot({ path: new URL('00-threat-revealed.png', artifactDir).pathname });

  const textOffStyle = await page.addStyleTag({ content: '.slice2-combat-hud strong,.slice2-combat-hud small{visibility:hidden!important}' });
  await page.screenshot({ path: new URL('01-threat-revealed-text-off.png', artifactDir).pathname });
  await textOffStyle.evaluate((element) => element.remove());

  await page.setViewportSize({ width: 960, height: 720 });
  await assertCriticalFit(page, ['.slice2-combat', '.encounter-threat-pulse', '[data-combat-primary="start-encounter"]', '.slice2-party-bars', '.enemy-bars']);
  const compactOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (compactOverflow !== 0) throw new Error(`Compact encounter horizontally overflows by ${compactOverflow}px`);
  await page.screenshot({ path: new URL('02-threat-revealed-4x3.png', artifactDir).pathname });
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.evaluate(() => { window.__P13_COMBAT_STAGE__ = document.querySelector('.slice2-combat'); });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && !snapshot.isBusy;
  });
  const sameStage = await page.evaluate(() => window.__P13_COMBAT_STAGE__ === document.querySelector('.slice2-combat') && window.__P13_COMBAT_STAGE__?.isConnected);
  if (!sameStage) throw new Error('Encounter start replaced the battlefield instead of revealing controls in place');
  await expectCount(page, '.encounter-overlay', 0, 'retired encounter gate');
  await expectCount(page, '.intent-stack.is-scene-first', 1, 'enemy intent after reveal');
  await expectCount(page, '.submission-action-dock', 1, 'player response after reveal');
  await expectCount(page, '.ally-intent-panel.is-policy-linked', 1, 'ally forecast after reveal');
  await page.screenshot({ path: new URL('03-same-stage-input.png', artifactDir).pathname });

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  const report = {
    status: 'ENCOUNTER_TRANSITION_PASS',
    encounter: { id: run.encounterId, progress: run.corridorProgress, party: 2, enemies: await page.locator('.enemy-bars .slice2-unit-bar').count() },
    reveal: { sceneFirst: true, blockingTitle: false, threatPulse: true, singlePrimaryAction: true, iconAndSpace: true },
    continuity: { sameCombatStage: sameStage, intentAfterReveal: true, responseAfterReveal: true, allyForecastAfterReveal: true },
    compactViewport: { width: 960, height: 720, horizontalOverflow: compactOverflow },
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function enterFirstJointEncounter(page) {
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'INTRO');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN');
  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' }).click();
  await page.locator('[data-onboarding-primary="execute-plan"]').click();
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && snapshot.state.turn === 2 && !snapshot.isBusy;
  });
  const slam = page.locator('.submission-action-dock .skill-button[data-action-id="SLAM"][data-executable="true"]');
  if (!await slam.count()) throw new Error('Solo fixture cannot finish with its authored turn-two slam');
  await slam.click();
  await page.locator('[data-combat-primary="execute-plan"]').click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'VICTORY', undefined, { timeout: 15_000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMPANION_SEALED');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMPANION_JOINED');
  await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');
  await page.screenshot({ path: new URL('before-encounter-corridor.png', artifactDir).pathname });
  for (let step = 0; step < 100; step += 1) {
    if ((await submissionSnapshot(page)).mode !== 'CORRIDOR') break;
    await page.keyboard.press('d');
  }
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_SUBMISSION__?.snapshot;
    return snapshot?.mode === 'COMBAT' && snapshot.encounterId === 'FIRST_WARRIOR' && snapshot.combat?.mode === 'INTRO';
  });
}

async function assertCriticalFit(page, selectors) {
  const viewport = page.viewportSize();
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Critical encounter element is not visible: ${selector}`);
    if (box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
      throw new Error(`Critical encounter element overflows viewport: ${selector} ${JSON.stringify(box)}`);
    }
  }
}

async function expectCount(page, selector, expected, label) {
  const count = await page.locator(selector).count();
  if (count !== expected) throw new Error(`${label}: expected ${expected}, got ${count} for ${selector}`);
}

async function submissionSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot); }

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
