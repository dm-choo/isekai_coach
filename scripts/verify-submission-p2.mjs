import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_P2_PORT ?? 4183);
const suppliedUrl = process.env.SUBMISSION_P2_URL;
const baseUrl = suppliedUrl ?? `http://127.0.0.1:${port}/?verify=1`;
const artifactDir = new URL('../artifacts/submission-p2/', import.meta.url);
const verifyP3 = process.env.SUBMISSION_VERIFY_STAGE === 'P3';
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  if (!suppliedUrl) {
    server = spawn(process.execPath, [
      'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
    ], {
      env: { ...process.env, VITE_SLICE: 'submission' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await waitForServer(baseUrl, server);
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request ${request.method()} ${request.url()} ${request.failure()?.errorText}`));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  if (await page.title() !== '결계의 바깥') throw new Error(`Unexpected title: ${await page.title()}`);
  if (await page.locator('.primary-expedition').count() !== 1) throw new Error('Intro does not expose exactly one primary expedition action');
  await capture(page, '00-intro');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');

  const beforeTravel = await corridorPresentation(page);
  await page.keyboard.press('d');
  await page.waitForTimeout(100);
  const afterTravel = await corridorPresentation(page);
  if (beforeTravel.partyX !== afterTravel.partyX) throw new Error(`Travel party drifted from ${beforeTravel.partyX} to ${afterTravel.partyX}`);
  if (beforeTravel.backdropPosition === afterTravel.backdropPosition || beforeTravel.groundPosition === afterTravel.groundPosition) {
    throw new Error(`World did not move behind the party: ${JSON.stringify({ beforeTravel, afterTravel })}`);
  }
  await capture(page, '01-corridor');

  await advanceCorridorUntil(page, 200);
  let run = await submissionSnapshot(page);
  if (run.mode !== 'COMBAT' || run.encounterId !== 'FIRST_WARRIOR' || run.corridorProgress !== 200 || run.worldTime !== '10:04') {
    throw new Error(`First spatial encounter did not stop at 200m: ${JSON.stringify(pickRunState(run))}`);
  }
  await capture(page, '02-first-encounter');
  const firstCombat = await completeCurrentCombat(page);
  run = await submissionSnapshot(page);
  if (run.mode !== 'CORRIDOR' || run.corridorProgress !== 200) throw new Error(`First combat did not resume the same corridor position: ${JSON.stringify(pickRunState(run))}`);

  await advanceCorridorUntil(page, 400);
  run = await submissionSnapshot(page);
  if (run.mode !== 'CENTER_GATE' || run.corridorProgress !== 400 || run.worldMinute !== 608 + firstCombat.turns) {
    throw new Error(`Central room gate was not reached at 400m: ${JSON.stringify(pickRunState(run))}`);
  }
  await capture(page, '03-center-gate');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMBAT');
  run = await submissionSnapshot(page);
  if (run.encounterId !== 'CENTER_GUARD') throw new Error(`Unexpected central encounter: ${run.encounterId}`);
  const centerCombat = await completeCurrentCombat(page);

  run = await submissionSnapshot(page);
  if (run.mode !== 'SCOUTED') throw new Error(`P2 did not reach SCOUTED: ${JSON.stringify(pickRunState(run))}`);
  const frontier = run.world.tiles.find((tile) => tile.id === 'frontier-east');
  if (!frontier || frontier.knowledge !== 'SCOUTED' || !frontier.corridorsScouted || frontier.threat !== 'CONTESTED') {
    throw new Error(`Central victory did not scout all corridors without falsely securing them: ${JSON.stringify(frontier)}`);
  }
  if (await page.locator('.scout-room').count() !== 4 || await page.locator('.scout-center').count() !== 1) {
    throw new Error('Scouting result does not render one central room and four connected rooms');
  }
  const causality = await page.locator('.scout-causality').innerText();
  if (!causality.includes('중앙 방 확보') || !causality.includes('모든 통로 정찰')) {
    throw new Error(`Scouting causality is missing: ${causality}`);
  }
  await capture(page, '04-scouted');

  let delegationReport;
  if (verifyP3) {
    const scoutedMinute = run.worldMinute;
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'POLICY_REVIEW');
    const evidenceText = await page.locator('.policy-evidence-focus').innerText();
    if (!evidenceText.includes('ACTUAL RECORD') || !evidenceText.includes('사격 판정') || !evidenceText.includes('유효 사거리')) {
      throw new Error(`Policy review is not grounded in the previous combat record: ${evidenceText}`);
    }
    await page.locator('.policy-choice-list button').filter({ hasText: '사격 거리를 계속 지킨다' }).click();
    let policyRun = await submissionSnapshot(page);
    if (policyRun.policyChoice !== 'KEEP_RANGE' || policyRun.policyDirectives.keepRange !== true) {
      throw new Error('Keep-range choice did not change the spatial directive');
    }
    await capture(page, '06-policy-review');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'DELEGATION_PLAN');
    const planText = await page.locator('.delegation-orders').innerText();
    if (!planText.includes('400m') || !planText.includes('HP 2 이하') || !planText.includes('전투 12턴') || !planText.includes('즉시 Decision')) {
      throw new Error(`Delegation plan omits route or stop conditions: ${planText}`);
    }
    if (await page.locator('.route-threat').count() !== 2) throw new Error('Known route does not expose both observed enemies');
    await capture(page, '07-keep-range-plan');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'DELEGATION_RESULT');
    run = await submissionSnapshot(page);
    const pausedResult = run.delegationResult;
    if (!pausedResult || pausedResult.outcome !== 'TIME_LIMIT' || pausedResult.finalHp <= 0) {
      throw new Error(`Keep-range trade-off did not preserve HP and stop at its time limit: ${JSON.stringify(pausedResult)}`);
    }
    const pausedFrontier = run.world.tiles.find((tile) => tile.id === 'frontier-east');
    if (pausedFrontier?.routeSafe || pausedFrontier?.threat !== 'CONTESTED' || !pausedFrontier?.anchorPrepared || pausedFrontier?.territory !== 'OUTSIDE') {
      throw new Error(`Paused operation changed the wrong territory axes: ${JSON.stringify(pausedFrontier)}`);
    }
    const pausedMinute = run.worldMinute;
    if (pausedMinute !== scoutedMinute + Math.max(run.protagonistTaskMinutes, pausedResult.elapsedMinutes)) {
      throw new Error('First concurrent operation did not use the longer duration');
    }
    await capture(page, '08-time-limit-result');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'POLICY_REVIEW');
    await page.locator('.policy-choice-list button').filter({ hasText: '가까우면 먼저 밀친다' }).click();
    policyRun = await submissionSnapshot(page);
    if (policyRun.policyChoice !== 'PUSH_FIRST' || policyRun.policy[0] !== 'PUSH') {
      throw new Error(`Push-first choice did not change the first policy slot: ${JSON.stringify(policyRun.policy)}`);
    }
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'DELEGATION_PLAN');
    if ((await submissionSnapshot(page)).protagonistTaskMinutes !== 0) {
      throw new Error('Prepared protagonist task was scheduled a second time on retry');
    }
    await capture(page, '09-revised-plan');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'DELEGATION_RESULT');
    run = await submissionSnapshot(page);
    const result = run.delegationResult;
    if (!result || result.outcome !== 'SECURED') {
      throw new Error(`Recommended one-place policy change did not secure the known route: ${JSON.stringify(result)}`);
    }
    const delegatedFrontier = run.world.tiles.find((tile) => tile.id === 'frontier-east');
    if (!delegatedFrontier?.routeSafe || delegatedFrontier.threat !== 'SECURED' || !delegatedFrontier.anchorPrepared || delegatedFrontier.territory !== 'OUTSIDE') {
      throw new Error(`Delegation changed the wrong territory axes: ${JSON.stringify(delegatedFrontier)}`);
    }
    const expectedSharedMinute = pausedMinute + Math.max(run.protagonistTaskMinutes, result.elapsedMinutes);
    if (run.worldMinute !== expectedSharedMinute) {
      throw new Error(`Shared time was summed or dropped: expected ${expectedSharedMinute}, got ${run.worldMinute}`);
    }
    if (await page.locator('.operation-causality article').count() !== 3 || await page.locator('.operation-log > div').count() === 0) {
      throw new Error('Operation result cannot reconstruct source, decision, and actual result');
    }
    await capture(page, '10-delegation-result');
    delegationReport = {
      firstAttempt: {
        choice: 'KEEP_RANGE', outcome: pausedResult.outcome, turns: pausedResult.turns,
        finalHp: pausedResult.finalHp, elapsedMinutes: pausedResult.elapsedMinutes,
      },
      choice: run.policyChoice,
      outcome: result.outcome,
      turns: result.turns,
      finalHp: result.finalHp,
      damageTaken: result.damageTaken,
      elapsedMinutes: result.elapsedMinutes,
      sharedWorldMinutes: run.worldMinute - pausedMinute,
      selectedCounts: result.selectedCounts,
      routeSafe: delegatedFrontier.routeSafe,
      anchorPrepared: delegatedFrontier.anchorPrepared,
      territory: delegatedFrontier.territory,
    };
  }

  await page.setViewportSize({ width: 960, height: 720 });
  await page.waitForTimeout(100);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (horizontalOverflow > 1) throw new Error(`4:3 scouted layout overflows horizontally by ${horizontalOverflow}px`);
  await capture(page, verifyP3 ? '11-delegation-result-4x3' : '05-scouted-4x3');
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    url: baseUrl,
    title: await page.title(),
    finalMode: run.mode,
    corridorProgress: run.corridorProgress,
    worldTime: run.worldTime,
    vitals: run.vitals,
    frontier: {
      knowledge: frontier.knowledge,
      threat: frontier.threat,
      territory: frontier.territory,
      corridorsScouted: frontier.corridorsScouted,
    },
    combat: { first: firstCombat, center: centerCombat },
    partyAnchored: beforeTravel.partyX === afterTravel.partyX,
    worldScrolled: beforeTravel.backdropPosition !== afterTravel.backdropPosition && beforeTravel.groundPosition !== afterTravel.groundPosition,
    centralRoomCausality: true,
    ...(delegationReport ? { delegation: delegationReport } : {}),
    horizontalOverflow4x3: horizontalOverflow,
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function advanceCorridorUntil(page, meters) {
  for (let step = 0; step < 100; step += 1) {
    const run = await submissionSnapshot(page);
    if (run.mode !== 'CORRIDOR' || run.corridorProgress >= meters) return;
    await page.keyboard.press('d');
  }
  throw new Error(`Corridor failed to reach ${meters}m`);
}

async function completeCurrentCombat(page) {
  let retries = 0;
  let turns = 0;
  for (let step = 0; step < 500; step += 1) {
    const combat = await combatSnapshot(page);
    if (!combat) throw new Error('Combat snapshot disappeared during encounter');
    if (combat.mode === 'INTRO') {
      await page.keyboard.press('Space');
      await page.waitForFunction(() => {
        const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
        return snapshot?.mode === 'PLAYER_TURN' && !snapshot.isBusy;
      });
      continue;
    }
    if (combat.mode === 'VICTORY') {
      turns = combat.state.turn;
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode !== 'COMBAT');
      return { turns, retries };
    }
    if (combat.mode === 'DEFEAT') {
      if (retries >= 3) throw new Error('P2 smoke player exceeded retry budget');
      retries += 1;
      await page.keyboard.press('Space');
      continue;
    }
    if (combat.mode !== 'PLAYER_TURN' || combat.isBusy) {
      await page.waitForTimeout(35);
      continue;
    }
    await playPlayerTurn(page, combat);
  }
  throw new Error('Combat did not finish within 500 state steps');
}

async function playPlayerTurn(page, snapshot) {
  for (let decision = 0; decision < 3; decision += 1) {
    snapshot = await combatSnapshot(page);
    const actor = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
    const enemies = snapshot.previewState.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
    if (!actor || actor.ap <= 0 || !enemies.length) break;
    const target = enemies.slice().sort((left, right) => distance(actor, left) - distance(actor, right) || left.spawnOrder - right.spawnOrder)[0];
    const picker = page.locator('.target-picker button').filter({ hasText: unitName(target) }).first();
    if (await picker.count()) await picker.click();
    snapshot = await combatSnapshot(page);
    const slam = snapshot.actions.find((action) => action.id === 'SLAM');
    const escape = safestMove(snapshot.previewState, actor.id, target.id);
    const currentGroundDanger = groundDangerAt(snapshot.previewState, actor.position);
    if (escape && currentGroundDanger > escape.groundDanger) {
      await page.locator('.wasd-grid button').filter({ hasText: escape.key }).click();
      continue;
    }
    if (slam?.executable) {
      await page.locator('.skill-button').filter({ hasText: '내려찍기' }).click();
      break;
    }
    const move = actor.hp <= 2 ? escape?.key : bestMove(snapshot.previewState, actor.id, target.id);
    if (!move) break;
    await page.locator('.wasd-grid button').filter({ hasText: move }).click();
  }
  const endTurn = page.locator('.end-turn-button');
  if (!await endTurn.isEnabled()) throw new Error('Smoke player produced no confirmable plan');
  await endTurn.click();
  await page.waitForTimeout(40);
}

function bestMove(state, actorId, targetId) {
  const actor = state.units.find((unit) => unit.id === actorId);
  const target = state.units.find((unit) => unit.id === targetId);
  if (!actor || !target) return undefined;
  const candidates = movementCandidates(state, actor).map(([key, position], order) => ({
    key, position, order, danger: dangerAt(state, position), distance: manhattan(position, target.position),
  }));
  candidates.sort((left, right) => left.distance + left.danger * 1.5 - (right.distance + right.danger * 1.5) || left.order - right.order);
  return candidates[0]?.key;
}

function safestMove(state, actorId, targetId) {
  const actor = state.units.find((unit) => unit.id === actorId);
  const target = state.units.find((unit) => unit.id === targetId);
  if (!actor || !target) return undefined;
  return movementCandidates(state, actor)
    .map(([key, position], order) => ({ key, position, order, danger: dangerAt(state, position), groundDanger: groundDangerAt(state, position) }))
    .sort((left, right) => left.groundDanger - right.groundDanger || left.danger - right.danger || manhattan(left.position, target.position) - manhattan(right.position, target.position) || left.order - right.order)[0];
}

function movementCandidates(state, actor) {
  return [
    ['W', { x: actor.position.x, y: actor.position.y - 1 }],
    ['S', { x: actor.position.x, y: actor.position.y + 1 }],
    ['A', { x: actor.position.x - 1, y: actor.position.y }],
    ['D', { x: actor.position.x + 1, y: actor.position.y }],
  ].filter(([, position]) => position.x >= 0 && position.x < state.map.width && position.y >= 0 && position.y < state.map.height && !state.units.some((unit) => unit.hp > 0 && unit.id !== actor.id && unit.position.x === position.x && unit.position.y === position.y));
}

function dangerAt(state, position) {
  return state.intents.reduce((sum, intent) => sum + Number(intent.effectCells.some((cell) => samePosition(cell, position)) || intent.plannedMovementPath.some((cell) => samePosition(cell, position))), 0);
}

function groundDangerAt(state, position) {
  return state.intents.reduce((sum, intent) => sum + Number(intent.anchor === 'GROUND' && intent.effectCells.some((cell) => samePosition(cell, position))), 0);
}

function samePosition(left, right) { return left.x === right.x && left.y === right.y; }
function manhattan(left, right) { return Math.abs(left.x - right.x) + Math.abs(left.y - right.y); }
function distance(left, right) { return manhattan(left.position, right.position); }
function unitName(unit) { if (unit.id.includes('archer')) return '고블린 궁수'; if (unit.id.includes('warrior')) return '고블린 전사'; return '고블린 투척병'; }
async function submissionSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot); }
async function combatSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot); }
async function corridorPresentation(page) {
  return page.evaluate(() => {
    const party = document.querySelector('.submission-travel-party')?.getBoundingClientRect();
    const backdrop = document.querySelector('.corridor-moving-backdrop');
    const ground = document.querySelector('.corridor-moving-ground');
    return {
      partyX: party?.x,
      backdropPosition: backdrop ? getComputedStyle(backdrop).backgroundPositionX : undefined,
      groundPosition: ground ? getComputedStyle(ground).backgroundPositionX : undefined,
    };
  });
}
function pickRunState(run) { return { mode: run.mode, progress: run.corridorProgress, time: run.worldTime, encounter: run.encounterId }; }
async function capture(page, name) { await page.waitForTimeout(80); await page.screenshot({ path: new URL(`${name}.png`, artifactDir).pathname }); }
async function waitForServer(url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited with ${child.exitCode}`);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
