import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_NORMAL_COMBAT_PORT ?? 4188);
const baseUrl = `http://127.0.0.1:${port}/?verify=1`;
const artifactDir = new URL('../artifacts/submission-normal-combat/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  server = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], { env: { ...process.env, VITE_SLICE: 'submission' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await waitForServer(baseUrl, server);
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  observeErrors(page, errors);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await enterSecondPlayerTurn(page);
  await page.waitForTimeout(800);

  const initial = await combatSnapshot(page);
  if (initial.mode !== 'PLAYER_TURN' || initial.state.turn !== 2 || initial.plannedActions.length !== 0) {
    throw new Error(`Normal combat verifier reached the wrong state: ${JSON.stringify({ mode: initial.mode, turn: initial.state.turn, planned: initial.plannedActions.length })}`);
  }
  await expectCount(page, '.turn-banner-player_turn', 0, 'retired player-turn banner');
  await expectCount(page, '.submission-action-dock[data-decision-focus="INPUT"]', 1, 'input-focused action dock');
  await expectCount(page, '.submission-action-dock .combat-actor-panel', 1, 'active actor/AP anchor');
  await expectCount(page, '.submission-action-dock .movement-control', 1, 'movement response');
  await expectCount(page, '.submission-action-dock .skill-button', 3, 'skill responses');
  await expectCount(page, '.submission-action-dock .skill-button[data-action-id]', 3, 'language-independent skill identities');
  await expectCount(page, '.submission-action-dock .target-picker', 0, 'redundant single-target picker');
  await expectCount(page, '.submission-action-dock .skill-tooltip:visible', 0, 'stationary-pointer skill detail');
  await expectCount(page, '.submission-action-dock .skill-state:visible', 0, 'persistent skill state sentences');
  await expectCount(page, '.submission-action-dock .input-feedback.is-committed:visible', 0, 'stale previous-turn execution feedback');
  await expectCount(page, '.intent-stack.is-scene-first:not(.is-learning-focus)', 1, 'scene-first intent stack');
  await expectCount(page, '.intent-stack.is-scene-first .intent-name:visible,.intent-stack.is-scene-first .intent-anchor-rule:visible', 0, 'persistent intent detail');
  await assertDockGeometry(page);
  await assertCriticalFit(page, ['.intent-stack.is-scene-first', '.submission-action-dock', '.combat-actor-panel', '.action-control', '.turn-control']);
  await page.screenshot({ path: new URL('00-input.png', artifactDir).pathname });

  const readySkill = page.locator('.submission-action-dock .skill-button[data-executable="true"]').first();
  if (!await readySkill.count()) throw new Error('Normal combat has no executable response to inspect');
  await readySkill.focus();
  await expectCount(page, '.submission-action-dock .skill-tooltip:visible', 1, 'deliberately requested skill detail');
  await page.screenshot({ path: new URL('01-deliberate-tooltip.png', artifactDir).pathname });
  await readySkill.blur();
  await expectCount(page, '.submission-action-dock .skill-tooltip:visible', 0, 'retired skill detail');

  await readySkill.click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.plannedActions.length === 1);
  const planned = await combatSnapshot(page);
  await expectCount(page, '.submission-action-dock.phase-planning[data-decision-focus="OUTCOME"]', 1, 'outcome-focused action dock');
  await expectCount(page, '.submission-action-dock .plan-chip', 1, 'planned action sequence');
  await expectCount(page, '.submission-action-dock [data-combat-primary="execute-plan"]', 1, 'single execution action');
  await expectCount(page, '.submission-action-dock .skill-tooltip:visible', 0, 'no tooltip under stationary pointer after rerender');
  if (!projectionChanged(planned)) throw new Error('Planned response has no authoritative-to-preview result');
  await assertDockGeometry(page);
  await page.screenshot({ path: new URL('02-outcome.png', artifactDir).pathname });

  const textOffStyle = await page.addStyleTag({ content: '.submission-action-dock strong,.submission-action-dock small,.submission-action-dock .plan-chip:not(i):not(img),.intent-sequence b{color:transparent!important;text-shadow:none!important}' });
  await page.screenshot({ path: new URL('03-outcome-text-off.png', artifactDir).pathname });
  await textOffStyle.evaluate((element) => element.remove());

  const compactPage = await browser.newPage({ viewport: { width: 960, height: 720 } });
  observeErrors(compactPage, errors);
  await compactPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await enterSecondPlayerTurn(compactPage);
  await compactPage.waitForTimeout(800);
  await assertDockGeometry(compactPage);
  await assertCriticalFit(compactPage, ['.intent-stack.is-scene-first', '.submission-action-dock', '.combat-actor-panel', '.action-control', '.turn-control']);
  const compactOverflow = await compactPage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (compactOverflow !== 0) throw new Error(`Compact normal combat horizontally overflows by ${compactOverflow}px`);
  await compactPage.screenshot({ path: new URL('04-input-4x3.png', artifactDir).pathname });
  await compactPage.close();

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  const dockBox = await page.locator('.submission-action-dock').boundingBox();
  const report = {
    status: 'NORMAL_COMBAT_INFORMATION_PASS',
    turn: initial.state.turn,
    hierarchy: { playerTurnBanner: false, actorAp: true, movement: true, skills: 3, planInsideDock: true },
    intent: { sourceSequencePersistent: true, detailOnDemand: true },
    tooltip: { stationaryHidden: true, focusVisible: true, blurHidden: true, rerenderHidden: true },
    outcome: { plannedActions: planned.plannedActions.length, previewChanged: true, primaryAction: 'SPACE' },
    viewport: { width: 1280, height: 720, dockHeight: dockBox?.height },
    compactViewport: { width: 960, height: 720, horizontalOverflow: 0 },
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function enterSecondPlayerTurn(page) {
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'INTRO');
  await page.locator('[data-combat-presentation="READY"]').waitFor();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN');
  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' }).click();
  await page.locator('[data-onboarding-primary="execute-plan"]').click();
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && snapshot.state.turn === 2 && !snapshot.isBusy;
  });
}

function projectionChanged(snapshot) {
  return snapshot.state.units.some((unit) => {
    const preview = snapshot.previewState.units.find((candidate) => candidate.id === unit.id);
    return preview && (preview.hp !== unit.hp || preview.status.guard !== unit.status.guard || preview.position.x !== unit.position.x || preview.position.y !== unit.position.y);
  });
}

async function assertDockGeometry(page) {
  const dock = await page.locator('.submission-action-dock').boundingBox();
  const plan = await page.locator('.submission-action-dock .plan-strip').boundingBox();
  if (!dock || !plan) throw new Error('Action dock or plan strip is not visible');
  if (dock.height > 150) throw new Error(`Action dock consumes too much scene height: ${dock.height}`);
  if (plan.x < dock.x - 1 || plan.y < dock.y - 1 || plan.x + plan.width > dock.x + dock.width + 1 || plan.y + plan.height > dock.y + dock.height + 1) {
    throw new Error(`Plan strip floats outside action dock: ${JSON.stringify({ dock, plan })}`);
  }
}

async function assertCriticalFit(page, selectors) {
  const viewport = page.viewportSize();
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Critical control is not visible: ${selector}`);
    if (box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
      throw new Error(`Critical control overflows viewport: ${selector} ${JSON.stringify(box)}`);
    }
  }
}

async function expectCount(page, selector, expected, label) {
  const count = await page.locator(selector).count();
  if (count !== expected) throw new Error(`${label}: expected ${expected}, got ${count} for ${selector}`);
}

async function combatSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot); }

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
