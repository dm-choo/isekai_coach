import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.COMBAT_UX_PORT ?? 4178);
const suppliedUrl = process.env.COMBAT_UX_URL;
const baseUrl = suppliedUrl ?? `http://127.0.0.1:${port}/slice1/`;
const artifactDir = new URL('../artifacts/combat-ux/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  if (!suppliedUrl) {
    server = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    await waitForServer(baseUrl, server);
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await capture(page, '00-intro');
  await page.getByRole('button', { name: '전투 시작' }).click();
  await waitForMode(page, 'PLAYER_TURN');
  await capture(page, '01-turn-1');
  await page.locator('.intent-callout').hover();
  await capture(page, '01b-intent-tooltip');
  await page.mouse.move(20, 690);

  await page.getByRole('button', { name: 'W', exact: true }).click();
  await capture(page, '02-player-plan');
  await page.getByRole('button', { name: /행동 확정/ }).click();
  await waitForTurn(page, 2);
  await capture(page, '03-turn-2');

  await page.getByRole('button', { name: 'S', exact: true }).click();
  await page.getByRole('button', { name: /내려찍기/ }).hover();
  await capture(page, '04-interrupt-preview');
  await page.getByRole('button', { name: /내려찍기/ }).click();
  await page.getByRole('button', { name: /행동 확정/ }).click();
  await waitForTurn(page, 3);
  await page.getByRole('button', { name: /대기 · 턴 종료/ }).click();
  await waitForTurn(page, 4);
  await capture(page, '05-summoned-enemy');

  let snapshot = await combatSnapshot(page);
  const hounds = snapshot.state.units.filter((unit) => unit.combatRole === 'MINION' && unit.hp > 0);
  if (hounds.length !== 1 || hounds[0].faction !== 'ENEMY') {
    throw new Error(`Expected one living ENEMY minion, received ${JSON.stringify(hounds)}`);
  }
  const houndPosition = hounds[0].position;
  await page.locator('canvas').click({
    position: {
      x: 62 + houndPosition.x * 105,
      y: 356 + houndPosition.y * 72 - 42,
    },
  });
  await page.waitForFunction((houndId) => (
    window.__ISEKAI_COACH_COMBAT__?.snapshot.selectedTargetId === houndId
  ), hounds[0].id);
  snapshot = await combatSnapshot(page);
  if (!snapshot.actions.some((action) => action.id === 'SLAM' && action.executable)) {
    throw new Error('Selected minion is not an executable melee target');
  }
  await capture(page, '06-summoned-enemy-selected');
  if (errors.length > 0) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    url: baseUrl,
    viewport: { width: 1280, height: 720 },
    mode: snapshot.mode,
    turn: snapshot.state.turn,
    selectedTargetId: snapshot.selectedTargetId,
    livingEnemies: snapshot.state.units
      .filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0)
      .map((unit) => ({ id: unit.id, role: unit.combatRole, position: unit.position })),
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function combatSnapshot(page) {
  return page.evaluate(() => {
    const state = window.__ISEKAI_COACH_COMBAT__;
    if (!state) throw new Error('Combat debug snapshot is unavailable');
    return state.snapshot;
  });
}

async function waitForMode(page, mode) {
  await page.waitForFunction((expected) => (
    window.__ISEKAI_COACH_COMBAT__?.snapshot.mode === expected &&
    !window.__ISEKAI_COACH_COMBAT__?.snapshot.isBusy
  ), mode, { timeout: 20_000 });
}

async function waitForTurn(page, turn) {
  await page.waitForFunction((expected) => (
    window.__ISEKAI_COACH_COMBAT__?.snapshot.mode === 'PLAYER_TURN' &&
    window.__ISEKAI_COACH_COMBAT__?.snapshot.state.turn === expected &&
    !window.__ISEKAI_COACH_COMBAT__?.snapshot.isBusy
  ), turn, { timeout: 25_000 });
}

async function capture(page, name) {
  await page.waitForTimeout(180);
  await page.screenshot({ path: new URL(`${name}.png`, artifactDir).pathname });
}
