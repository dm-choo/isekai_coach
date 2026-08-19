import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_FAILURE_PORT ?? 4185);
const baseUrl = `http://127.0.0.1:${port}/?verify=1&failure=1`;
const artifactDir = new URL('../artifacts/submission-failure/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });
try {
  server = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], { env: { ...process.env, VITE_SLICE: 'submission' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await waitForServer(baseUrl, server);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request ${request.method()} ${request.url()} ${request.failure()?.errorText}`));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.keyboard.press('Space');
  await advanceCorridorUntilCombat(page);
  const firstFixture = await runSnapshot(page);
  if (firstFixture.encounterId !== 'FIRST_WARRIOR' || firstFixture.encounterContent !== 'GOBLIN_WARRIOR') {
    throw new Error(`Failure fixture reached the wrong encounter: ${JSON.stringify(firstFixture)}`);
  }

  let defeated;
  let lastCombat;
  for (let step = 0; step < 160; step += 1) {
    const combat = await combatSnapshot(page);
    lastCombat = combat;
    if (combat.mode === 'INTRO') await page.keyboard.press('Space');
    else if (combat.mode === 'PLAYER_TURN' && !combat.isBusy) {
      const administrator = combat.previewState.units.find((unit) => unit.id === 'administrator-slice2');
      if (combat.plannedActions.length || administrator?.hp === 0) await page.keyboard.press('Space');
      else {
        const move = approachMove(combat.previewState);
        if (!move) throw new Error(`Failure fixture cannot create a suicidal plan: ${JSON.stringify(combat.previewState.units)}`);
        await page.locator('.wasd-grid button').filter({ hasText: move }).click();
      }
    }
    else if (combat.mode === 'DEFEAT') { defeated = combat; break; }
    else if (combat.mode === 'VICTORY') throw new Error('Low-vital failure fixture won before retreat could be verified');
    else await page.waitForTimeout(35);
  }
  if (!defeated) throw new Error(`Failure fixture did not reach DEFEAT: ${JSON.stringify({ mode: lastCombat?.mode, turn: lastCombat?.state?.turn, units: lastCombat?.state?.units })}`);
  const defeatCopy = await page.locator('.result-overlay').innerText();
  if (!defeatCopy.includes('안전 영토로 후퇴') || !defeatCopy.includes('시간·보급·부상')) {
    throw new Error(`Defeat overlay does not explain persistent retreat costs: ${defeatCopy}`);
  }
  await page.screenshot({ path: new URL('00-defeat.png', artifactDir).pathname });
  const beforeRetreat = await runSnapshot(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'INTRO');
  const retreated = await runSnapshot(page);
  if (retreated.corridorProgress !== 0 || retreated.defeatCount !== 1 || retreated.supplies.water !== 0 || retreated.supplies.food !== 0) {
    throw new Error(`Defeat did not return to safe territory with persistent costs: ${JSON.stringify(retreated)}`);
  }
  if (!retreated.lastDefeatCost || retreated.worldMinute !== beforeRetreat.worldMinute + retreated.lastDefeatCost.elapsedMinutes) {
    throw new Error(`Defeat time cost was not preserved: ${JSON.stringify({ before: beforeRetreat.worldMinute, after: retreated.worldMinute, cost: retreated.lastDefeatCost })}`);
  }
  if (!retreated.notice.includes('부상 유지') || retreated.vitals.administratorHp >= 14 || retreated.vitals.allyHp >= 12) {
    throw new Error(`Retreat erased injury or failed to explain it: ${JSON.stringify({ notice: retreated.notice, vitals: retreated.vitals })}`);
  }
  const retreatScreen = await page.locator('.territory-stage').innerText();
  if (!retreatScreen.includes('상처를 안고') || !retreatScreen.includes('위협 재추첨 없음')) {
    throw new Error(`Safe-territory recovery screen is not actionable: ${retreatScreen}`);
  }
  await page.screenshot({ path: new URL('01-safe-retreat.png', artifactDir).pathname });

  await page.keyboard.press('Space');
  await advanceCorridorUntilCombat(page);
  const retried = await runSnapshot(page);
  if (retried.encounterId !== firstFixture.encounterId || retried.encounterContent !== firstFixture.encounterContent) {
    throw new Error(`Retry rerolled the encounter: ${JSON.stringify({ first: firstFixture.encounterContent, retried: retried.encounterContent })}`);
  }
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    status: 'FAILURE_RECOVERY_PASS',
    encounterId: retried.encounterId,
    encounterContent: retried.encounterContent,
    defeatTurn: defeated.state.turn,
    worldMinuteBeforeRetreat: beforeRetreat.worldMinute,
    worldMinuteAfterRetreat: retreated.worldMinute,
    defeatCost: retreated.lastDefeatCost,
    suppliesAfterRetreat: retreated.supplies,
    vitalsAfterRetreat: retreated.vitals,
    corridorAfterRetreat: retreated.corridorProgress,
    rerolled: false,
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function advanceCorridorUntilCombat(page) {
  for (let step = 0; step < 90; step += 1) {
    const run = await runSnapshot(page);
    if (run.mode === 'COMBAT') return;
    if (run.mode !== 'CORRIDOR') throw new Error(`Expected corridor while finding encounter, got ${run.mode}`);
    await page.keyboard.press('d');
  }
  throw new Error('Corridor did not reach the fixed encounter');
}

async function runSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot); }
async function combatSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot); }

function approachMove(state) {
  const actor = state.units.find((unit) => unit.id === 'administrator-slice2');
  const enemy = state.units.find((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  if (!actor || !enemy) return undefined;
  const candidates = [
    ['W', { x: actor.position.x, y: actor.position.y - 1 }],
    ['S', { x: actor.position.x, y: actor.position.y + 1 }],
    ['A', { x: actor.position.x - 1, y: actor.position.y }],
    ['D', { x: actor.position.x + 1, y: actor.position.y }],
  ].filter(([, position]) => position.x >= 0 && position.x < state.map.width && position.y >= 0 && position.y < state.map.height
    && !state.units.some((unit) => unit.hp > 0 && unit.position.x === position.x && unit.position.y === position.y));
  candidates.sort((left, right) => manhattan(left[1], enemy.position) - manhattan(right[1], enemy.position));
  return candidates[0]?.[0];
}

function manhattan(left, right) { return Math.abs(left.x - right.x) + Math.abs(left.y - right.y); }

async function waitForServer(url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited with ${child.exitCode}`);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
