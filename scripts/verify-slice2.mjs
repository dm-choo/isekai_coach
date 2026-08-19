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
let blockedPreviewCaptured = false;
let firstRestUsed = false;
let traversalCaptured = false;
let allyPlanCaptured = false;
let partyPolicyVerified = false;
let corridorScrollVerified = false;
let targetPickerHiddenVerified = false;
let targetPickerShownVerified = false;
let intentOwnershipVerified = false;
let expeditionPolicyTuned = false;
let multiIntentCaptured = false;
let bomberIntentCaptured = false;
let inputFeedbackVerified = false;
let intentSequenceVerified = false;
let groundAnchorCopyVerified = false;

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
  await page.keyboard.press('Space');
  await capture(page, '01-world-tile');

  const resourceText = await page.locator('.run-stats').innerText();
  if (/[水食]/u.test(resourceText)) throw new Error(`Resource HUD still contains language-substitute glyphs: ${resourceText}`);
  if (await page.locator('.mini-next-tile').count() !== 1) throw new Error('Local mini-map does not show the next world-tile direction');
  await page.locator('.party-toggle').click();
  const initialPolicy = (await runSnapshot(page)).policy;
  await page.getByRole('button', { name: /사격.*위로/ }).click();
  const reorderedPolicy = (await runSnapshot(page)).policy;
  if (JSON.stringify(initialPolicy) === JSON.stringify(reorderedPolicy)) throw new Error('Party policy editor did not reorder policy outside combat');
  await capture(page, '01a-party-policy');
  await page.getByRole('button', { name: /사격.*아래로/ }).click();
  const restoredPolicy = (await runSnapshot(page)).policy;
  if (JSON.stringify(initialPolicy) !== JSON.stringify(restoredPolicy)) throw new Error('Party policy editor did not restore policy order');
  await page.getByRole('button', { name: '닫기' }).click();
  partyPolicyVerified = true;

  let combatCount = 0;
  let retries = 0;
  let lastProgress = '';
  let repeatedProgress = 0;
  for (let step = 0; step < 2_000; step += 1) {
    const run = await runSnapshot(page);
    const combat = run.mode === 'COMBAT' ? await combatSnapshot(page) : null;
    const progress = JSON.stringify([
      run.mode,
      run.currentTileIndex,
      run.currentNodeId,
      combat?.mode,
      combat?.state?.turn,
      combat?.state?.units?.map((unit) => [unit.id, unit.hp, unit.ap, unit.position.x, unit.position.y]),
    ]);
    repeatedProgress = progress === lastProgress ? repeatedProgress + 1 : 0;
    lastProgress = progress;
    if (repeatedProgress > 120) {
      await capture(page, 'stalled-state');
      throw new Error(`Slice 2 stalled without state progress: ${progress}`);
    }
    if (step > 0 && step % 50 === 0) process.stderr.write(`verify:slice2 step ${step}: ${progress}\n`);
    if (run.mode === 'VICTORY') break;
    if (run.mode === 'DEFEAT') {
      if (retries >= 4) throw new Error('Slice 2 heuristic exceeded retry budget');
      retries += 1;
      await page.getByRole('button', { name: /같은 인카운터 재시도/ }).click();
      continue;
    }
    if (run.mode === 'EXPLORE') {
      if (run.currentTileIndex >= 1 && !expeditionPolicyTuned) {
        await page.locator('.party-toggle').click();
        while ((await runSnapshot(page)).policy[0] !== 'SHOOT') {
          await page.getByRole('button', { name: /사격.*위로/ }).click();
        }
        await page.getByRole('button', { name: '닫기' }).click();
        expeditionPolicyTuned = true;
        continue;
      }
      if (run.currentTileIndex === 0 && run.currentNodeId === 'room-center' && run.canRest && !firstRestUsed) {
        firstRestUsed = true;
        await page.locator('.rest-button').click();
        continue;
      }
      if (run.traversal) {
        if (!traversalCaptured) {
          traversalCaptured = true;
          await capture(page, '01b-corridor-traversal');
        }
        if (!corridorScrollVerified) {
          const before = await corridorPresentation(page);
          await page.keyboard.press('d');
          await page.waitForTimeout(100);
          const after = await corridorPresentation(page);
          if (before.partyX !== after.partyX) throw new Error(`Corridor party drifted from ${before.partyX} to ${after.partyX}`);
          if (before.depthPosition === after.depthPosition || before.groundPosition === after.groundPosition) {
            throw new Error(`Corridor world did not scroll: ${JSON.stringify({ before, after })}`);
          }
          corridorScrollVerified = true;
          continue;
        }
        await page.keyboard.press('d');
        continue;
      }
      if (run.canAdvanceTile) {
        await page.locator('.advance-world-button').click();
        continue;
      }
      if (run.currentNodeId === 'room-west' || run.currentNodeId === 'room-center') {
        await page.locator('.room-door[data-direction="EAST"]').click();
        continue;
      }
      throw new Error(`No authored room route from ${run.currentNodeId}: ${JSON.stringify(run.availableDoorDirections)}`);
      continue;
    }
    if (run.mode !== 'COMBAT') throw new Error(`Unexpected run mode ${run.mode}`);
    if (combat.mode === 'INTRO') {
      combatCount += 1;
      if (combatCount === 1) await capture(page, '02-first-encounter');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.mode === 'PLAYER_TURN' && !window.__ISEKAI_COACH_COMBAT__?.snapshot.isBusy);
      const activeCombat = await combatSnapshot(page);
      const markers = await page.locator('.intent-owner').allTextContents();
      if (markers.length !== activeCombat.previewState.intents.length || markers.some((marker, index) => marker !== String.fromCharCode(65 + index))) {
        throw new Error(`Intent ownership markers do not match intent order: ${JSON.stringify(markers)}`);
      }
      if (await page.locator('.encounter-title').count() !== 0) throw new Error('Encounter title persisted after combat introduction');
      intentOwnershipVerified = true;
      const intentCards = page.locator('.enemy-intent-card');
      for (let index = 0; index < activeCombat.previewState.intents.length; index += 1) {
        const intent = activeCombat.previewState.intents[index];
        if (activeCombat.concealedIntentIds.includes(intent.id)) continue;
        const text = await intentCards.nth(index).innerText();
        if (intent.plannedMovementPath.length > 0 && !text.includes(`이동 ${intent.plannedMovementPath.length}`)) {
          throw new Error(`Intent ${index} does not expose movement before attack: ${text}`);
        }
        if (!text.includes(intent.anchor === 'GROUND' ? '표시된 땅에 고정' : '적의 도착점에서 발동')) {
          throw new Error(`Intent ${index} does not explain its anchor in player language: ${text}`);
        }
        intentSequenceVerified = true;
        if (intent.anchor === 'GROUND') groundAnchorCopyVerified = true;
      }
      if (!inputFeedbackVerified) {
        const blockedAction = page.locator('.skill-button.is-disabled').first();
        if (await blockedAction.count() === 0) throw new Error('First combat did not expose a locally explained unavailable action');
        const plannedBefore = activeCombat.plannedActions.length;
        await blockedAction.click();
        await page.locator('.input-feedback.is-rejected').waitFor();
        const rejectedCombat = await combatSnapshot(page);
        if (rejectedCombat.plannedActions.length !== plannedBefore || rejectedCombat.inputFeedback?.kind !== 'REJECTED') {
          throw new Error(`Rejected input changed the plan or lacked feedback: ${JSON.stringify(rejectedCombat.inputFeedback)}`);
        }
        inputFeedbackVerified = true;
        await page.mouse.move(640, 150);
        await capture(page, '02a-input-feedback');
      }
      if (!multiIntentCaptured && activeCombat.previewState.intents.length >= 2) {
        multiIntentCaptured = true;
        await page.mouse.move(640, 150);
        await capture(page, '02c-multi-enemy-ownership');
      }
      if (!bomberIntentCaptured && activeCombat.previewState.intents.some((intent) => intent.abilityId === 'goblin-bomb')) {
        bomberIntentCaptured = true;
        await page.mouse.move(640, 150);
        await capture(page, '02d-bomber-ownership');
      }
      continue;
    }
    if (combat.mode === 'VICTORY') {
      await page.keyboard.press('Space');
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
    if (!allyPlanCaptured) {
      allyPlanCaptured = true;
      await page.locator('.enemy-intent-card').first().hover();
      await page.locator('.ally-intent-panel summary').click();
      await capture(page, '02b-ally-plan-and-intent-tooltip');
      await page.locator('.ally-intent-panel summary').click();
      await page.mouse.move(640, 360);
    }
    const pickerCount = await page.locator('.target-picker button').count();
    if (pickerCount !== combat.targetableEnemyIds.length) throw new Error(`Target picker exposed ${pickerCount} targets, expected ${combat.targetableEnemyIds.length}`);
    if (pickerCount === 0) targetPickerHiddenVerified = true;
    else targetPickerShownVerified = true;
    await playPlayerTurn(page, combat);
  }

  const final = await runSnapshot(page);
  if (final.mode !== 'VICTORY') {
    const combat = await combatSnapshot(page);
    await capture(page, 'failure-state');
    throw new Error(`Slice 2 did not finish: ${final.mode} tile ${final.currentTileIndex + 1} ${final.currentNodeId}\n${JSON.stringify(combat, null, 2)}`);
  }
  if (!blockedPreviewCaptured) throw new Error('Blocked enemy movement preview was not exercised');
  if (!multiIntentCaptured) throw new Error('Multi-enemy intent ownership was not captured');
  if (!bomberIntentCaptured) throw new Error('Bomber intent ownership was not captured');
  if (!targetPickerHiddenVerified || !targetPickerShownVerified) throw new Error('Target picker did not exercise both hidden and actionable states');
  if (!inputFeedbackVerified) throw new Error('Rejected input feedback was not verified');
  if (!intentSequenceVerified || !groundAnchorCopyVerified) throw new Error('Player-readable BODY/GROUND intent grammar was not fully verified');
  await capture(page, '03-complete');
  const night = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  night.on('console', (message) => { if (message.type() === 'error') errors.push(`night ${message.text()}`); });
  night.on('pageerror', (error) => errors.push(`night ${error.message}`));
  const nightUrl = new URL(baseUrl);
  nightUrl.searchParams.set('verify', '1');
  nightUrl.searchParams.set('start', String(17 * 60 + 58));
  await night.goto(nightUrl.toString(), { waitUntil: 'networkidle' });
  await night.keyboard.press('Space');
  await night.locator('.room-door[data-direction="EAST"]').click();
  for (let step = 0; step < 40; step += 1) {
    if ((await runSnapshot(night)).mode !== 'EXPLORE') break;
    await night.keyboard.press('d');
  }
  await night.keyboard.press('Space');
  await night.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.mode === 'PLAYER_TURN' && !window.__ISEKAI_COACH_COMBAT__?.snapshot.isBusy);
  const concealedBeforeLight = await night.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.concealedIntentIds.length ?? 0);
  if (concealedBeforeLight !== 1) throw new Error(`Night encounter concealed ${concealedBeforeLight} intents instead of one`);
  await night.screenshot({ path: new URL('05-night-concealed.png', artifactDir).pathname });
  await night.locator('.light-button').click();
  const concealedAfterLight = await night.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.concealedIntentIds.length ?? -1);
  if (concealedAfterLight !== 0) throw new Error(`Portable light left ${concealedAfterLight} intents concealed`);
  await night.screenshot({ path: new URL('06-night-revealed.png', artifactDir).pathname });
  await night.close();
  const compact = await browser.newPage({ viewport: { width: 960, height: 720 } });
  compact.on('console', (message) => { if (message.type() === 'error') errors.push(`4:3 ${message.text()}`); });
  compact.on('pageerror', (error) => errors.push(`4:3 ${error.message}`));
  await compact.goto(baseUrl, { waitUntil: 'networkidle' });
  await compact.keyboard.press('Space');
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
    elapsedEventMinutes: final.elapsedEventMinutes,
    vitals: final.vitals,
    policy: final.policy,
    worldTime: final.worldTime,
    supplies: final.supplies,
    restCount: final.restCount,
    browserErrors: errors,
    blockedPreviewCaptured,
    nightConcealmentVerified: concealedBeforeLight === 1 && concealedAfterLight === 0,
    corridorTraversalCaptured: traversalCaptured,
    allyPlanAndTooltipCaptured: allyPlanCaptured,
    partyPolicyVerified,
    corridorScrollVerified,
    targetPickerHiddenVerified,
    targetPickerShownVerified,
    intentOwnershipVerified,
    expeditionPolicyTuned,
    multiIntentCaptured,
    bomberIntentCaptured,
    inputFeedbackVerified,
    intentSequenceVerified,
    groundAnchorCopyVerified,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function playPlayerTurn(page, snapshot) {
  for (let action = 0; action < 3; action += 1) {
    snapshot = await combatSnapshot(page);
    const actor = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
    const enemies = snapshot.previewState.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
    if (!actor || !enemies.length || actor.ap <= 0) break;
    const target = enemies.slice().sort((left, right) => distance(actor, left) - distance(actor, right) || left.spawnOrder - right.spawnOrder)[0];
    const targetButton = page.locator('.target-picker button').filter({ hasText: unitName(target) }).first();
    if (await targetButton.count()) await targetButton.click();
    snapshot = await combatSnapshot(page);
    const slam = snapshot.actions.find((candidate) => candidate.id === 'SLAM');
    if (process.env.SLICE2_DEBUG === '1') {
      process.stderr.write(`player decision ${JSON.stringify({
        scenarioId: snapshot.scenarioId,
        turn: snapshot.state.turn,
        actor: snapshot.previewState.units.find((unit) => unit.id === actor.id),
        target: snapshot.previewState.units.find((unit) => unit.id === target.id),
        selectedTargetId: snapshot.selectedTargetId,
        actions: snapshot.actions,
        plannedActions: snapshot.plannedActions,
      })}\n`);
    }
    const escape = safestMove(snapshot.previewState, actor.id, target.id);
    const currentDanger = dangerAt(snapshot.previewState, actor.position);
    const currentGroundDanger = groundDangerAt(snapshot.previewState, actor.position);
    const shouldEscape = escape && (
      (currentGroundDanger > 0 && escape.groundDanger < currentGroundDanger) ||
      (actor.hp <= 2 && currentDanger > 0 && escape.danger < currentDanger)
    );
    if (shouldEscape) {
      await page.locator('.wasd-grid button').filter({ hasText: escape.key }).click();
      await page.waitForTimeout(30);
      continue;
    }
    if (slam?.executable) {
      const slamButton = page.locator('.skill-button').filter({ hasText: '내려찍기' });
      if (process.env.SLICE2_DEBUG === '1') {
        const box = await slamButton.boundingBox();
        const hit = box ? await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          return element ? { tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 40) } : null;
        }, { x: box.x + box.width / 2, y: box.y + box.height / 2 }) : null;
        process.stderr.write(`attack button hit ${JSON.stringify({ box, hit })}\n`);
      }
      await slamButton.click();
      await page.waitForTimeout(30);
      if (process.env.SLICE2_DEBUG === '1') {
        const afterAttackClick = await combatSnapshot(page);
        process.stderr.write(`after attack click ${JSON.stringify({
          turn: afterAttackClick.state.turn,
          plannedActions: afterAttackClick.plannedActions,
          notice: afterAttackClick.notice,
        })}\n`);
      }
      break;
    }
    const move = actor.hp <= 2 ? escape?.key : bestMove(snapshot.previewState, actor.id, target.id);
    if (!move) break;
    await page.locator('.wasd-grid button').filter({ hasText: move }).click();
    await page.waitForTimeout(30);
    const afterMove = await combatSnapshot(page);
    const warriorIntent = afterMove.previewState.intents.find((intent) => intent.sourceId === 'goblin-warrior');
    if (!blockedPreviewCaptured && warriorIntent && warriorIntent.movementPath.length < 4) {
      blockedPreviewCaptured = true;
      await capture(page, '02-blocked-warrior-preview');
    }
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

function safestMove(state, actorId, targetId) {
  const actor = state.units.find((unit) => unit.id === actorId);
  const target = state.units.find((unit) => unit.id === targetId);
  if (!actor || !target) return null;
  return [
    ['W', { x: actor.position.x, y: actor.position.y - 1 }],
    ['S', { x: actor.position.x, y: actor.position.y + 1 }],
    ['A', { x: actor.position.x - 1, y: actor.position.y }],
    ['D', { x: actor.position.x + 1, y: actor.position.y }],
  ]
    .filter(([, position]) => position.x >= 0 && position.x < state.map.width && position.y >= 0 && position.y < state.map.height && !state.units.some((unit) => unit.hp > 0 && unit.id !== actor.id && unit.position.x === position.x && unit.position.y === position.y))
    .map(([key, position], order) => ({ key, position, order, danger: dangerAt(state, position), groundDanger: groundDangerAt(state, position) }))
    .sort((left, right) => left.groundDanger - right.groundDanger || left.danger - right.danger || Math.abs(left.position.x - target.position.x) + Math.abs(left.position.y - target.position.y) - Math.abs(right.position.x - target.position.x) - Math.abs(right.position.y - target.position.y) || left.order - right.order)[0] ?? null;
}

function dangerAt(state, position) {
  return state.intents.reduce((sum, intent) => sum + Number(
    intent.effectCells.some((cell) => cell.x === position.x && cell.y === position.y) ||
    intent.plannedMovementPath.some((cell) => cell.x === position.x && cell.y === position.y)
  ), 0);
}

function groundDangerAt(state, position) {
  return state.intents.reduce((sum, intent) => sum + Number(intent.anchor === 'GROUND' && intent.effectCells.some((cell) => cell.x === position.x && cell.y === position.y)), 0);
}

function moveScore(state, position, target) {
  const danger = dangerAt(state, position);
  // A deterministic smoke player must sometimes accept one forecast hit to
  // close distance; overweighting danger makes it oscillate forever outside a
  // long-shot lane after the ranged ally falls.
  return Math.abs(position.x - target.x) + Math.abs(position.y - target.y) + danger * 1.5;
}

function distance(left, right) { return Math.abs(left.position.x - right.position.x) + Math.abs(left.position.y - right.position.y); }
function unitName(unit) { if (unit.id.includes('archer')) return '고블린 궁수'; if (unit.id.includes('warrior')) return '고블린 전사'; return '고블린 투척병'; }
async function runSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SLICE2__?.snapshot); }
async function combatSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot); }
async function corridorPresentation(page) {
  return page.evaluate(() => {
    const party = document.querySelector('.travel-party')?.getBoundingClientRect();
    const depth = document.querySelector('.corridor-depth');
    const ground = document.querySelector('.corridor-ground');
    return {
      partyX: party?.x,
      depthPosition: depth ? getComputedStyle(depth).backgroundPositionX : undefined,
      groundPosition: ground ? getComputedStyle(ground).backgroundPositionX : undefined,
    };
  });
}
async function capture(page, name) { await page.waitForTimeout(150); await page.screenshot({ path: new URL(`${name}.png`, artifactDir).pathname }); }
async function waitForServer(url, child) { const deadline = Date.now() + 15_000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Vite exited with ${child.exitCode}`); try { if ((await fetch(url)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 120)); } throw new Error(`Timed out waiting for ${url}`); }
