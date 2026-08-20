import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_FAILURE_PORT ?? 4185);
const baseUrl = `http://127.0.0.1:${port}/?verify=1&failure=1`;
const nonVerifyUrl = `http://127.0.0.1:${port}/`;
const saveKey = 'isekai-coach:submission:v3';
const legacySaveKey = 'isekai-coach:submission:v2';
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
  observeErrors(page, errors);

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  logStage('legacy fixture loaded');
  await advancePrologueUntilCombat(page);
  const firstFixture = await runSnapshot(page);
  if (firstFixture.encounterId !== 'SOLO_WARRIOR' || firstFixture.encounterContent !== 'GOBLIN_WARRIOR') {
    throw new Error(`Failure fixture reached the wrong encounter: ${JSON.stringify(firstFixture)}`);
  }

  const defeated = await driveSoloToDefeat(page);
  logStage('legacy defeat reached');
  const defeatCopy = await page.locator('.result-overlay').innerText();
  if (!defeatCopy.includes('안전 영토로 후퇴') || !defeatCopy.includes('시간·보급·부상')) {
    throw new Error(`Defeat overlay does not explain persistent retreat costs: ${defeatCopy}`);
  }
  await page.screenshot({ path: new URL('00-defeat.png', artifactDir).pathname });
  const beforeRetreat = await runSnapshot(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'AWAKENING');
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
  if (await page.locator('[data-submission-primary="advance-prologue"][data-primary-key="D"]').count() !== 1 || await page.locator('img[alt="원거리 동료"]').count()) {
    throw new Error('Solo defeat did not return to the actionable solo awakening state');
  }
  await page.screenshot({ path: new URL('01-safe-retreat.png', artifactDir).pathname });

  await advancePrologueUntilCombat(page);
  const retried = await runSnapshot(page);
  if (retried.encounterId !== firstFixture.encounterId || retried.encounterContent !== firstFixture.encounterContent) {
    throw new Error(`Retry rerolled the encounter: ${JSON.stringify({ first: firstFixture.encounterContent, retried: retried.encounterContent })}`);
  }

  logStage('legacy retry preserved');
  const atomicDefeatSave = await verifyAtomicDefeatSave(browser, errors);
  logStage('atomic defeat save verified');
  const delegationRecovery = await verifyDelegationRecovery(browser, errors);
  logStage('delegation recovery verified');
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
    atomicDefeatSave,
    delegationRecovery,
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function verifyAtomicDefeatSave(browserInstance, errors) {
  const context = await browserInstance.newContext({ viewport: { width: 960, height: 720 } });
  const page = await context.newPage();
  observeErrors(page, errors);
  try {
    const fixture = createLowHpSoloFixture();
    await loadSaveFixture(page, fixture, '[data-submission-primary="advance-prologue"]');
    logStage('atomic fixture hydrated');
    const loaded = await savedSubmission(page);
    if (loaded.version !== 3 || loaded.mode !== 'SOLO_APPROACH' || loaded.vitals.administratorHp !== 1) {
      throw new Error(`Non-verify low-HP v3 fixture did not hydrate: ${JSON.stringify(loaded)}`);
    }

    await page.keyboard.press('d');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMBAT');
    logStage('atomic fixture combat entered');
    const defeated = await driveSoloToDefeat(page);
    logStage('atomic fixture defeat reached');
    const defeatUi = await runSnapshot(page);
    if (defeatUi.mode !== 'COMBAT' || defeatUi.combat?.mode !== 'DEFEAT'
      || await page.locator('.result-overlay').count() !== 1) {
      throw new Error('Defeat UI disappeared before its recovery save was made durable');
    }

    const recovered = await waitForSaved(page, (save) => save?.mode === 'AWAKENING' && save.defeatCount === 1);
    logStage('atomic recovery checkpoint observed');
    const cost = recovered.lastDefeatCost;
    if (!cost || recovered.worldMinute !== defeatUi.worldMinute + cost.elapsedMinutes
      || recovered.elapsedBattleTurns !== defeatUi.elapsedBattleTurns + defeated.state.turn
      || recovered.supplies.water !== 0 || recovered.supplies.food !== 0
      || recovered.vitals.administratorHp < 3 || recovered.vitals.allyHp < 3
      || recovered.prologueProgress !== 0 || recovered.corridorProgress !== 0) {
      throw new Error(`DEFEAT did not atomically persist its recovery state: ${JSON.stringify({ defeatUi, defeatedTurn: defeated.state.turn, recovered })}`);
    }
    await page.screenshot({ path: new URL('02-defeat-save-already-durable.png', artifactDir).pathname });

    const durable = defeatRecoveryFields(recovered);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-submission-primary="advance-prologue"][data-primary-key="D"]').waitFor();
    const restored = await waitForSaved(page, (save) => save?.mode === 'AWAKENING' && save.defeatCount === 1);
    logStage('atomic recovery checkpoint reloaded');
    if (JSON.stringify(defeatRecoveryFields(restored)) !== JSON.stringify(durable)) {
      throw new Error(`Reload lost the already-paid defeat recovery: ${JSON.stringify({ durable, restored: defeatRecoveryFields(restored) })}`);
    }
    await page.screenshot({ path: new URL('03-defeat-save-restored.png', artifactDir).pathname });
    return {
      uiModeAtSave: 'DEFEAT',
      durableMode: recovered.mode,
      defeatTurn: defeated.state.turn,
      defeatCount: recovered.defeatCount,
      worldMinuteBeforeCost: defeatUi.worldMinute,
      worldMinuteAfterCost: recovered.worldMinute,
      defeatCost: cost,
      vitals: recovered.vitals,
      supplies: recovered.supplies,
      reloadPreserved: true,
    };
  } finally {
    await context.close();
  }
}

async function verifyDelegationRecovery(browserInstance, errors) {
  const context = await browserInstance.newContext({ viewport: { width: 960, height: 720 } });
  const page = await context.newPage();
  observeErrors(page, errors);
  try {
    await loadSaveFixture(page, createNextEastDelegationFixture(), '[data-submission-primary="review-record"]');
    logStage('delegation fixture hydrated');
    await page.keyboard.press('Space');
    await page.locator('[data-policy-choice="KEEP_RANGE"]').waitFor();
    await page.keyboard.press('2');
    await page.locator('[data-policy-choice="KEEP_RANGE"].is-selected').waitFor();
    await page.keyboard.press('Space');
    await page.locator('.submission-delegation-plan[data-route-id="next-east"][data-delegation-policy="KEEP_RANGE"]').waitFor();
    await page.keyboard.press('Space');
    await page.locator('.submission-delegation-result[data-route-id="next-east"][data-operation-outcome="RETREATED"]').waitFor();
    logStage('delegation KEEP_RANGE retreated');
    const retreatSnapshot = await runSnapshot(page);
    const retreatSave = await waitForSaved(page, (save) => save?.mode === 'DELEGATION_RESULT' && save.delegationResult?.outcome === 'RETREATED');
    const recoveryPrimary = page.locator('[data-submission-primary="recover-delegation"][data-primary-key="SPACE"]');
    if (retreatSnapshot.vitals.allyHp !== 2 || retreatSave.vitals.allyHp !== 2
      || !retreatSnapshot.delegationRecoveryRequired
      || Number(await recoveryPrimary.getAttribute('data-recovery-minutes')) !== 30) {
      throw new Error(`Golden HP4 KEEP_RANGE did not expose its costly recovery: ${JSON.stringify({ retreatSnapshot, retreatSave })}`);
    }
    await page.screenshot({ path: new URL('04-delegation-retreated.png', artifactDir).pathname });

    const retreatMinute = retreatSave.worldMinute;
    const retreatSupplies = JSON.stringify(retreatSave.supplies);
    await page.keyboard.press('Space');
    await page.locator('[data-policy-choice="PUSH_FIRST"]').waitFor();
    const recovered = await waitForSaved(page, (save) => save?.mode === 'POLICY_REVIEW' && save.worldMinute === retreatMinute + 30);
    logStage('delegation recovery paid');
    const recoveredSnapshot = await runSnapshot(page);
    if (recovered.vitals.allyHp < 4 || recoveredSnapshot.vitals.allyHp < 4
      || recovered.worldMinute !== retreatMinute + 30
      || JSON.stringify(recovered.supplies) !== retreatSupplies
      || recoveredSnapshot.delegationRecoveryRequired) {
      throw new Error(`Delegation recovery did not pay 30 minutes for HP >= 4: ${JSON.stringify({ retreatMinute, recovered, recoveredSnapshot })}`);
    }
    await page.screenshot({ path: new URL('05-delegation-recovered.png', artifactDir).pathname });

    await page.keyboard.press('1');
    await page.locator('[data-policy-choice="PUSH_FIRST"].is-selected').waitFor();
    await page.keyboard.press('Space');
    await page.locator('.submission-delegation-plan[data-route-id="next-east"][data-delegation-policy="PUSH_FIRST"]').waitFor();
    await page.keyboard.press('Space');
    await page.locator('.submission-delegation-result[data-route-id="next-east"][data-operation-outcome="SECURED"]').waitFor();
    logStage('delegation PUSH_FIRST secured');
    const securedSnapshot = await runSnapshot(page);
    const secured = await waitForSaved(page, (save) => save?.mode === 'DELEGATION_RESULT' && save.delegationResult?.outcome === 'SECURED');
    const frontier = secured.world.tiles.find((tile) => tile.id === 'next-east');
    if (securedSnapshot.delegationRecoveryRequired || secured.delegationAttempt !== 2
      || secured.delegationResult?.outcome !== 'SECURED' || secured.policyChoice !== 'PUSH_FIRST'
      || frontier?.threat !== 'SECURED' || !frontier.routeSafe
      || await page.locator('[data-submission-primary="recover-delegation"]').count()
      || await page.locator('[data-submission-primary="approach-anchor"][data-primary-key="SPACE"]').count() !== 1) {
      throw new Error(`Recovered PUSH_FIRST retry did not escape the retreat loop: ${JSON.stringify({ securedSnapshot, secured, frontier })}`);
    }
    await page.screenshot({ path: new URL('06-delegation-secured-after-recovery.png', artifactDir).pathname });

    await page.keyboard.press('Space');
    await page.locator('.submission-anchor-approach[data-route-id="next-east"][data-anchor-state="TRAVELING"]').waitFor();
    const exited = await waitForSaved(page, (save) => save?.mode === 'ANCHOR_APPROACH');
    return {
      frontierId: 'next-east',
      initialAllyHp: 4,
      firstPolicy: 'KEEP_RANGE',
      firstOutcome: retreatSave.delegationResult.outcome,
      retreatAllyHp: retreatSave.vitals.allyHp,
      recoveryMinutes: recovered.worldMinute - retreatMinute,
      recoveredAllyHp: recovered.vitals.allyHp,
      retryPolicy: secured.policyChoice,
      retryOutcome: secured.delegationResult.outcome,
      retryAllyHp: secured.vitals.allyHp,
      delegationAttempts: secured.delegationAttempt,
      routeSafe: frontier.routeSafe,
      exitedTo: exited.mode,
      permanentLoop: false,
    };
  } finally {
    await context.close();
  }
}

async function driveSoloToDefeat(page) {
  let lastCombat;
  for (let step = 0; step < 240; step += 1) {
    const combat = await combatSnapshot(page);
    lastCombat = combat;
    if (!combat) {
      await page.waitForTimeout(35);
      continue;
    }
    if (combat.mode === 'INTRO') {
      await page.locator('[data-combat-presentation="READY"]').waitFor({ timeout: 60_000 });
      await page.keyboard.press('Space');
    } else if (combat.mode === 'PLAYER_TURN' && !combat.isBusy) {
      const administrator = combat.previewState.units.find((unit) => unit.id === 'administrator-slice2');
      if (combat.state.turn === 1) {
        if (combat.plannedActions.length === 0) {
          await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' }).click();
        } else {
          const execute = page.locator('[data-onboarding-primary="execute-plan"]');
          if (!await execute.count()) throw new Error('Failure fixture cannot clear the authored first-turn learning gate');
          await execute.click();
        }
      } else if (combat.plannedActions.length || administrator?.hp === 0) {
        await page.keyboard.press('Space');
      } else {
        const nearestEnemy = combat.previewState.units
          .filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0)
          .sort((left, right) => manhattan(administrator.position, left.position) - manhattan(administrator.position, right.position))[0];
        const wait = page.locator('[data-combat-primary="wait"]:not(:disabled)');
        if (nearestEnemy && manhattan(administrator.position, nearestEnemy.position) <= 2 && await wait.count()) {
          await wait.click();
          continue;
        }
        const move = approachMove(combat.previewState);
        if (!move) throw new Error(`Failure fixture cannot create a suicidal plan: ${JSON.stringify(combat.previewState.units)}`);
        await page.locator('.wasd-grid button').filter({ hasText: move }).click();
      }
    } else if (combat.mode === 'DEFEAT') {
      return combat;
    } else if (combat.mode === 'VICTORY') {
      throw new Error('Low-vital failure fixture won before retreat could be verified');
    } else {
      await page.waitForTimeout(35);
    }
  }
  throw new Error(`Failure fixture did not reach DEFEAT: ${JSON.stringify({ mode: lastCombat?.mode, turn: lastCombat?.state?.turn, units: lastCombat?.state?.units })}`);
}

async function advancePrologueUntilCombat(page) {
  for (let step = 0; step < 25; step += 1) {
    const run = await runSnapshot(page);
    if (run.mode === 'COMBAT') return;
    if (run.mode !== 'AWAKENING' && run.mode !== 'SOLO_APPROACH') throw new Error(`Expected prologue while finding encounter, got ${run.mode}`);
    await page.keyboard.press('d');
  }
  throw new Error('Prologue did not reach the fixed encounter');
}

async function runSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot); }
async function combatSnapshot(page) { return page.evaluate(() => window.__ISEKAI_COACH_COMBAT__?.snapshot); }

async function loadSaveFixture(page, fixture, readySelector) {
  await page.goto(nonVerifyUrl, { waitUntil: 'networkidle' });
  await page.evaluate(({ currentKey, oldKey, save }) => {
    localStorage.removeItem(oldKey);
    localStorage.setItem(currentKey, JSON.stringify(save));
  }, { currentKey: saveKey, oldKey: legacySaveKey, save: fixture });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator(readySelector).waitFor();
  await waitForSaved(page, (save) => save?.version === 3 && save.mode === fixture.mode);
}

async function savedSubmission(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), saveKey);
}

async function waitForSaved(page, predicate) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const save = await savedSubmission(page);
    if (predicate(save)) return save;
    await page.waitForTimeout(25);
  }
  throw new Error('Timed out waiting for a durable v3 failure checkpoint');
}

function defeatRecoveryFields(save) {
  return {
    mode: save.mode,
    worldMinute: save.worldMinute,
    elapsedBattleTurns: save.elapsedBattleTurns,
    defeatCount: save.defeatCount,
    lastDefeatCost: save.lastDefeatCost,
    vitals: save.vitals,
    supplies: save.supplies,
    prologueProgress: save.prologueProgress,
    corridorProgress: save.corridorProgress,
  };
}

function createLowHpSoloFixture() {
  return createSaveFixture({
    mode: 'SOLO_APPROACH',
    world: createCanonicalWorld(),
    worldMinute: 600,
    prologueProgress: 95,
    soloEncounterResolved: false,
    companionJoined: false,
    corridorProgress: 0,
    vitals: { administratorHp: 1, allyHp: 1 },
    supplies: { water: 1, food: 1 },
    firstEncounterResolved: false,
    anchorProgress: 0,
    notice: '첫 위협 직전.',
  });
}

function createNextEastDelegationFixture() {
  const world = createCanonicalWorld({ firstExpanded: true, nextEastScouted: true });
  return createSaveFixture({
    mode: 'SCOUTED',
    world,
    worldMinute: 700,
    prologueProgress: 100,
    soloEncounterResolved: true,
    companionJoined: true,
    corridorProgress: 400,
    selectedFrontierId: 'next-east',
    activeFrontierId: 'next-east',
    vitals: { administratorHp: 10, allyHp: 4 },
    supplies: { water: 2, food: 0 },
    firstEncounterResolved: true,
    anchorProgress: 0,
    notice: '동쪽 중앙 방 확보.',
  });
}

function createSaveFixture(input) {
  return {
    version: 3,
    mode: input.mode,
    world: input.world,
    worldMinute: input.worldMinute,
    prologueProgress: input.prologueProgress,
    soloEncounterResolved: input.soloEncounterResolved,
    companionJoined: input.companionJoined,
    corridorProgress: input.corridorProgress,
    ...(input.selectedFrontierId ? { selectedFrontierId: input.selectedFrontierId } : {}),
    ...(input.activeFrontierId ? { activeFrontierId: input.activeFrontierId } : {}),
    vitals: input.vitals,
    supplies: input.supplies,
    policy: ['EVADE', 'POSITION', 'SHOOT', 'PUSH', 'EMPTY'],
    policyDirectives: {},
    notice: input.notice,
    firstEncounterResolved: input.firstEncounterResolved,
    elapsedBattleTurns: 0,
    lastProtagonistTaskMinutes: 0,
    delegationAttempt: 0,
    anchorProgress: input.anchorProgress,
    defeatCount: 0,
  };
}

function createCanonicalWorld(options = {}) {
  const firstExpanded = options.firstExpanded === true;
  const nextEastScouted = options.nextEastScouted === true;
  return {
    revision: nextEastScouted ? 6 : firstExpanded ? 5 : 0,
    tiles: [
      tile('initial-barrier', '깨어난 정원', 0, 0, {
        knowledge: 'SCOUTED', threat: 'SECURED', territory: 'INCORPORATED', utility: 'ACTIVE', stabilized: true,
        corridorsScouted: true, routeSafe: true, anchorPrepared: true, revealsOnIncorporation: ['frontier-east'],
      }),
      tile('frontier-east', '물안개 전초지', 1, 0, firstExpanded ? {
        knowledge: 'SCOUTED', threat: 'SECURED', territory: 'INCORPORATED', utility: 'ACTIVE', stabilized: true,
        corridorsScouted: true, routeSafe: true, anchorPrepared: true, protagonistAtAnchor: true,
        utilityKind: 'SPRING', revealsOnIncorporation: ['next-east', 'frontier-north'],
      } : {
        knowledge: 'REVEALED', utilityKind: 'SPRING', revealsOnIncorporation: ['next-east', 'frontier-north'],
      }),
      tile('next-east', '붉은 수관림', 2, 0, nextEastScouted ? {
        knowledge: 'SCOUTED', threat: 'CONTESTED', corridorsScouted: true, revealsOnIncorporation: [],
      } : { knowledge: firstExpanded ? 'REVEALED' : 'UNSEEN', revealsOnIncorporation: [] }),
      tile('frontier-north', '기울어진 성소', 1, -1, {
        knowledge: firstExpanded ? 'REVEALED' : 'UNSEEN', revealsOnIncorporation: [],
      }),
      tile('frontier-south', '침수된 회랑', 1, 1, {
        knowledge: 'UNSEEN', revealsOnIncorporation: [],
      }),
    ],
  };
}

function tile(id, name, x, y, overrides) {
  return {
    id, name, coordinate: { x, y }, knowledge: 'UNSEEN', threat: 'HOSTILE', territory: 'OUTSIDE',
    utility: 'DORMANT', stabilized: false, corridorsScouted: false, routeSafe: false,
    anchorPrepared: false, protagonistAtAnchor: false, revealsOnIncorporation: [], ...overrides,
  };
}

function observeErrors(page, errors) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request ${request.method()} ${request.url()} ${request.failure()?.errorText}`));
}

function logStage(stage) {
  process.stdout.write(`[failure] ${stage}\n`);
}

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
