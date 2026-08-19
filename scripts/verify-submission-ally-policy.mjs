import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_ALLY_POLICY_PORT ?? 4189);
const baseUrl = `http://127.0.0.1:${port}/?verify=1&policy=1`;
const artifactDir = new URL('../artifacts/submission-ally-policy/', import.meta.url);
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
  await enterFirstJointCombat(page);
  await page.waitForTimeout(800);

  const initial = await combatSnapshot(page);
  if (initial.mode !== 'PLAYER_TURN' || initial.state.units.filter((unit) => unit.faction === 'STUDENT' && unit.hp > 0).length !== 2) {
    throw new Error(`Verifier did not reach the first joined player turn: ${JSON.stringify({ mode: initial.mode, turn: initial.state.turn })}`);
  }
  const initialSteps = initial.allyIntent?.steps ?? [];
  if (!initialSteps.length || initialSteps.some((step) => !step.policyId || step.policyRank < 1 || !step.policyReason)) {
    throw new Error(`Ally forecast lacks policy source metadata: ${JSON.stringify(initialSteps)}`);
  }
  const panel = page.locator('.ally-intent-panel.is-policy-linked');
  await expectCount(page, '.ally-intent-panel.is-policy-linked[data-forecast-basis="CURRENT"]', 1, 'current-state ally forecast');
  await expectCount(page, '.ally-intent-panel.is-policy-linked:not([open])', 1, 'closed policy detail by default');
  await expectCount(page, '.ally-intent-panel.is-policy-linked .ally-forecast-token', initialSteps.length, 'policy-ranked forecast steps');
  await expectCount(page, '.ally-intent-panel.is-policy-linked .policy-source-strip:visible,.ally-intent-panel.is-policy-linked .ally-intent-sequence:visible', 0, 'hidden demand detail');
  await assertCriticalFit(page, ['.ally-intent-panel.is-policy-linked', '.submission-action-dock']);
  await page.screenshot({ path: new URL('00-current-forecast.png', artifactDir).pathname });

  await panel.locator('summary').click();
  await expectCount(page, '.ally-intent-panel.is-policy-linked[open] .policy-source-strip > span', 5, 'five policy source slots');
  await expectCount(page, '.ally-intent-panel.is-policy-linked[open] .ally-intent-step.is-policy-step', initialSteps.length, 'forecast explanations');
  if (!await page.locator('.ally-intent-panel.is-policy-linked[open] .ally-intent-step em').first().isVisible()) {
    throw new Error('Expanded forecast does not expose a blocked higher-priority policy');
  }
  await assertCriticalFit(page, ['.ally-intent-panel.is-policy-linked[open]']);
  await page.screenshot({ path: new URL('01-policy-source-open.png', artifactDir).pathname });
  await panel.locator('summary').click();

  const initialSignature = await panel.getAttribute('data-forecast-signature');
  const currentAdministrator = initial.state.units.find((unit) => unit.id === 'administrator-slice2');
  let planned;
  let chosenMove;
  for (const key of ['W', 'A', 'S', 'D']) {
    await page.locator('.submission-action-dock .wasd-grid button').filter({ hasText: key }).click();
    await page.waitForTimeout(100);
    const candidate = await combatSnapshot(page);
    if (candidate.plannedActions.length === 0) continue;
    const signature = await panel.getAttribute('data-forecast-signature');
    if (signature !== initialSignature) {
      planned = candidate;
      chosenMove = key;
      break;
    }
    await page.keyboard.press('z');
    await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.plannedActions.length === 0);
  }
  if (!planned || !chosenMove) throw new Error('No one-step player plan produced a visibly different ally forecast');
  const plannedAdministrator = planned.previewState.units.find((unit) => unit.id === 'administrator-slice2');
  const authoritativeAdministrator = planned.state.units.find((unit) => unit.id === 'administrator-slice2');
  if (authoritativeAdministrator?.position.x !== currentAdministrator?.position.x || authoritativeAdministrator?.position.y !== currentAdministrator?.position.y || (plannedAdministrator?.position.x === authoritativeAdministrator?.position.x && plannedAdministrator?.position.y === authoritativeAdministrator?.position.y)) {
    throw new Error('Player plan did not remain a provisional projection');
  }
  await expectCount(page, '.ally-intent-panel.is-policy-linked[data-forecast-basis="PLANNED"]', 1, 'plan-linked ally forecast');
  await page.screenshot({ path: new URL('02-plan-linked-forecast.png', artifactDir).pathname });

  await page.setViewportSize({ width: 960, height: 720 });
  await panel.locator('summary').click();
  await assertCriticalFit(page, ['.ally-intent-panel.is-policy-linked[open]', '.submission-action-dock']);
  const compactOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (compactOverflow !== 0) throw new Error(`Compact policy forecast horizontally overflows by ${compactOverflow}px`);
  await page.screenshot({ path: new URL('03-policy-source-4x3.png', artifactDir).pathname });
  await panel.locator('summary').click();
  await page.setViewportSize({ width: 1280, height: 720 });

  const plannedFirstPolicy = planned.allyIntent?.steps[0]?.policyId;
  if (!plannedFirstPolicy) throw new Error('Plan-linked forecast has no first policy');
  await page.evaluate(() => {
    window.__ALLY_POLICY_EXECUTION__ = undefined;
    const capture = () => {
      const result = document.querySelector('[data-policy-selected]');
      const selected = result?.getAttribute('data-policy-selected');
      if (selected && selected !== 'EMPTY' && window.__ALLY_POLICY_EXECUTION__ === undefined) window.__ALLY_POLICY_EXECUTION__ = selected;
    };
    const observer = new MutationObserver(capture);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.__ALLY_POLICY_OBSERVER__ = observer;
  });
  await page.locator('[data-combat-primary="execute-plan"]').click();
  const execution = page.locator('.submission-policy-execution [data-policy-selected]').first();
  await execution.waitFor({ timeout: 12_000 });
  await expectCount(page, '.turn-banner-ally_turn,.combat-notice', 0, 'duplicate ally phase explanation');
  await page.screenshot({ path: new URL('04-policy-execution.png', artifactDir).pathname });
  await page.waitForFunction(() => window.__ALLY_POLICY_EXECUTION__ !== undefined, undefined, { timeout: 12_000 });
  const executedPolicy = await page.evaluate(() => {
    window.__ALLY_POLICY_OBSERVER__?.disconnect();
    return window.__ALLY_POLICY_EXECUTION__;
  });
  if (executedPolicy !== plannedFirstPolicy) {
    throw new Error(`Forecast policy ${plannedFirstPolicy} did not match execution ${executedPolicy}`);
  }
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    status: 'ALLY_POLICY_CAUSALITY_PASS',
    firstJointTurn: initial.state.turn,
    forecast: { steps: initialSteps.length, policyRanks: initialSteps.map((step) => step.policyRank), detailDefaultClosed: true, blockedReasonOnDemand: true },
    plan: { key: chosenMove, basisBefore: 'CURRENT', basisAfter: 'PLANNED', signatureChanged: true, authoritativeUnchanged: true },
    execution: { forecastPolicy: plannedFirstPolicy, executedPolicy, matched: true },
    compactViewport: { width: 960, height: 720, horizontalOverflow: compactOverflow },
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function enterFirstJointCombat(page) {
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'INTRO');
  await page.locator('[data-combat-presentation="READY"]').waitFor();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN');
  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' }).click();
  await page.locator('[data-onboarding-primary="execute-plan"]').click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN' && window.__ISEKAI_COACH_COMBAT__.snapshot.state.turn === 2 && !window.__ISEKAI_COACH_COMBAT__.snapshot.isBusy);
  const slam = page.locator('.submission-action-dock .skill-button[data-executable="true"]').filter({ hasText: '내려찍기' });
  if (!await slam.count()) throw new Error('Solo fixture cannot finish with the authored turn-two slam');
  await slam.click();
  await page.locator('[data-combat-primary="execute-plan"]').click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'VICTORY', undefined, { timeout: 15_000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMPANION_SEALED');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMPANION_JOINED');
  await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');
  for (let step = 0; step < 100; step += 1) {
    const run = await submissionSnapshot(page);
    if (run.mode !== 'CORRIDOR') break;
    await page.keyboard.press('d');
  }
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMBAT' && window.__ISEKAI_COACH_SUBMISSION__.snapshot.encounterId === 'FIRST_WARRIOR');
  await page.locator('[data-combat-presentation="READY"]').waitFor();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN' && !window.__ISEKAI_COACH_COMBAT__.snapshot.isBusy);
}

async function assertCriticalFit(page, selectors) {
  const viewport = page.viewportSize();
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Critical policy element is not visible: ${selector}`);
    if (box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
      throw new Error(`Critical policy element overflows viewport: ${selector} ${JSON.stringify(box)}`);
    }
  }
}

async function expectCount(page, selector, expected, label) {
  const count = await page.locator(selector).count();
  if (count !== expected) throw new Error(`${label}: expected ${expected}, got ${count} for ${selector}`);
}

async function submissionSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot); }
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
