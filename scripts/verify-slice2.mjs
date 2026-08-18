import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SLICE2_PORT ?? 4182);
const suppliedUrl = process.env.SLICE2_URL;
const baseUrl = suppliedUrl ?? `http://127.0.0.1:${port}/slice2/?verify=1`;
const artifactDir = new URL('../artifacts/slice2/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  if (!suppliedUrl) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
    await waitForServer(baseUrl, server);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await capture(page, '00-intro');
  await page.getByRole('button', { name: '원정 시작' }).click();
  await capture(page, '01-world-tile');

  const route = ['room-west', 'west-4', 'west-3', 'west-2', 'west-1', 'room-center', 'east-1', 'east-2', 'east-3', 'east-4', 'room-east'];
  let combatCount = 0;
  let retries = 0;
  for (let step = 0; step < 500; step += 1) {
    const run = await runSnapshot(page);
    if (run.mode === 'VICTORY') break;
    if (run.mode === 'POLICY_REVIEW') {
      await capture(page, 'policy-review');
      await page.getByRole('button', { name: /사격 우선으로 변경/ }).click();
      continue;
    }
    if (run.mode === 'DEFEAT') {
      if (retries >= 4) throw new Error('Slice 2 heuristic exceeded retry budget');
      retries += 1;
      await page.getByRole('button', { name: /같은 인카운터 재시도/ }).click();
      continue;
    }
    if (run.mode === 'EXPLORE') {
      if (run.canAdvanceTile) {
        await page.locator('.advance-world-button').click();
        continue;
      }
      const routeIndex = route.indexOf(run.currentNodeId);
      const next = route[routeIndex + 1];
      if (!next || !run.availableNodeIds.includes(next)) throw new Error(`No authored route from ${run.currentNodeId}: ${JSON.stringify(run.availableNodeIds)}`);
      await page.locator(`.node-${next}`).click();
      await page.waitForTimeout(80);
      continue;
    }
    if (run.mode !== 'COMBAT') throw new Error(`Unexpected run mode ${run.mode}`);
    const combat = await combatSnapshot(page);
    if (combat.mode === 'INTRO') {
      combatCount += 1;
      if (combatCount === 1) await capture(page, '02-first-encounter');
      await page.getByRole('button', { name: '전투 시작' }).click();
      await page.waitForTimeout(100);
      continue;
    }
    if (combat.mode === 'VICTORY') {
      await page.getByRole('button', { name: '통로로 복귀' }).click();
      continue;
    }
    if (combat.mode === 'DEFEAT') {
      if (retries >= 4) throw new Error('Slice 2 combat exceeded retry budget');
      retries += 1;
      await page.getByRole('button', { name: /같은 인카운터 재시도/ }).click();
      continue;
    }
    if (combat.mode !== 'PLAYER_TURN' || combat.isBusy) {
      await page.waitForTimeout(120);
      continue;
    }
    await playPlayerTurn(page, combat);
  }

  const final = await runSnapshot(page);
  if (final.mode !== 'VICTORY') {
    const combat = await combatSnapshot(page);
    await capture(page, 'failure-state');
    throw new Error(`Slice 2 did not finish: ${final.mode} tile ${final.currentTileIndex + 1} ${final.currentNodeId}\n${JSON.stringify(combat, null, 2)}`);
  }
  await capture(page, '03-complete');
  const compact = await browser.newPage({ viewport: { width: 960, height: 720 } });
  compact.on('console', (message) => { if (message.type() === 'error') errors.push(`4:3 ${message.text()}`); });
  compact.on('pageerror', (error) => errors.push(`4:3 ${error.message}`));
  await compact.goto(baseUrl, { waitUntil: 'networkidle' });
  await compact.getByRole('button', { name: '원정 시작' }).click();
  const compactOverflow = await compact.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (compactOverflow > 1) throw new Error(`4:3 layout overflows horizontally by ${compactOverflow}px`);
  await compact.screenshot({ path: new URL('04-world-tile-4x3.png', artifactDir).pathname });
  await compact.close();
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  const report = {
    url: baseUrl,
    viewport: { width: 1280, height: 720 },
    compactViewport: { width: 960, height: 720, horizontalOverflow: compactOverflow },
    mode: final.mode,
    clearedTiles: final.world.tiles.filter((tile) => tile.cleared).length,
    combatCount,
    retries,
    elapsedTravel: final.elapsedTravel,
    elapsedBattleTurns: final.elapsedBattleTurns,
    vitals: final.vitals,
    policy: final.policy,
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function playPlayerTurn(page, snapshot) {
  for (let action = 0; action < 2; action += 1) {
    snapshot = await combatSnapshot(page);
    const actor = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
    const enemies = snapshot.previewState.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
    if (!actor || !enemies.length || actor.ap <= 0) break;
    const target = enemies.slice().sort((left, right) => distance(actor, left) - distance(actor, right) || left.spawnOrder - right.spawnOrder)[0];
    const targetButton = page.locator('.target-picker button').filter({ hasText: unitName(target) }).first();
    if (await targetButton.count()) await targetButton.click();
    snapshot = await combatSnapshot(page);
    const slam = snapshot.actions.find((candidate) => candidate.id === 'SLAM');
    if (slam?.executable) {
      await page.locator('.skill-button').filter({ hasText: '내려찍기' }).click();
      break;
    }
    const move = bestMove(snapshot.previewState, actor.id, target.id);
    if (!move) break;
    await page.getByRole('button', { name: move, exact: true }).click();
    await page.waitForTimeout(30);
  }
  await page.locator('.end-turn-button').click();
  await page.waitForTimeout(120);
}

function bestMove(state, actorId, targetId) {
  const actor = state.units.find((unit) => unit.id === actorId);
  const target = state.units.find((unit) => unit.id === targetId);
  if (!actor || !target) return null;
  const candidates = [
    ['W', { x: actor.position.x, y: actor.position.y - 1 }],
    ['S', { x: actor.position.x, y: actor.position.y + 1 }],
    ['A', { x: actor.position.x - 1, y: actor.position.y }],
    ['D', { x: actor.position.x + 1, y: actor.position.y }],
  ].filter(([, position]) => position.x >= 0 && position.x < state.map.width && position.y >= 0 && position.y < state.map.height && !state.units.some((unit) => unit.hp > 0 && unit.id !== actor.id && unit.position.x === position.x && unit.position.y === position.y));
  candidates.sort((left, right) => moveScore(state, left[1], target.position) - moveScore(state, right[1], target.position));
  return candidates[0]?.[0] ?? null;
}

function moveScore(state, position, target) {
  const danger = state.intents.reduce((sum, intent) => sum + Number(intent.effectCells.some((cell) => cell.x === position.x && cell.y === position.y)), 0);
  return Math.abs(position.x - target.x) + Math.abs(position.y - target.y) + danger * 2.5;
}

function distance(left, right) { return Math.abs(left.position.x - right.position.x) + Math.abs(left.position.y - right.position.y); }
function unitName(unit) { if (unit.id.includes('archer')) return '고블린 궁수'; if (unit.id.includes('warrior')) return '고블린 전사'; return '고블린 투척병'; }
async function runSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SLICE2__?.snapshot); }
async function combatSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot); }
async function capture(page, name) { await page.waitForTimeout(150); await page.screenshot({ path: new URL(`${name}.png`, artifactDir).pathname }); }
async function waitForServer(url, child) { const deadline = Date.now() + 15_000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Vite exited with ${child.exitCode}`); try { if ((await fetch(url)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 120)); } throw new Error(`Timed out waiting for ${url}`); }
