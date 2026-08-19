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
  const revealedEnemyCount = await page.locator('.enemy-bars .slice2-unit-bar').count();
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

  const beforeVictoryRun = await submissionSnapshot(page);
  await completeCombatToVictory(page, 'first joint');
  await page.waitForTimeout(500);
  const victory = await combatSnapshot(page);
  if (victory.mode !== 'VICTORY') throw new Error(`First joint encounter did not reach victory: ${victory.mode}`);
  const finalAdministrator = victory.state.units.find((unit) => unit.id === 'administrator-slice2');
  const finalAlly = victory.state.units.find((unit) => unit.id === 'archer-companion-slice2');
  await expectCount(page, '.result-overlay.is-seamless-path[data-combat-result="PATH_SECURED"]', 1, 'scene-first path result');
  await expectCount(page, '.turn-banner-victory,.combat-notice,.result-overlay.is-seamless-path h2,.result-overlay.is-seamless-path p,.result-overlay.is-seamless-path > span:not(.secured-world-path):not(.result-time-cost)', 0, 'duplicate victory title and explanation copy');
  await expectCount(page, '.enemy-bars .slice2-unit-bar', 0, 'living enemy bars after victory');
  await expectCount(page, '.slice2-party-bars .slice2-unit-bar', 2, 'persistent party state after victory');
  await expectCount(page, '.secured-world-path,.result-time-cost,[data-combat-primary="resume-corridor"]', 3, 'path, time, and resume result');
  if (await page.locator('.result-time-cost b').innerText() !== `+${victory.state.turn}`) throw new Error('Victory time badge does not match combat turns');
  if (await page.locator('[data-combat-primary="resume-corridor"] kbd').innerText() !== 'SPACE') throw new Error('Corridor resume action does not expose SPACE');
  await assertCriticalFit(page, ['.slice2-combat', '.secured-world-path', '.result-time-cost', '[data-combat-primary="resume-corridor"]', '.slice2-party-bars']);
  await page.screenshot({ path: new URL('04-path-secured.png', artifactDir).pathname });

  await page.setViewportSize({ width: 960, height: 720 });
  await assertCriticalFit(page, ['.slice2-combat', '.secured-world-path', '.result-time-cost', '[data-combat-primary="resume-corridor"]', '.slice2-party-bars']);
  const resultCompactOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (resultCompactOverflow !== 0) throw new Error(`Compact path result horizontally overflows by ${resultCompactOverflow}px`);
  await page.screenshot({ path: new URL('05-path-secured-4x3.png', artifactDir).pathname });
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');
  const resumed = await submissionSnapshot(page);
  if (resumed.corridorProgress !== 200 || resumed.worldMinute !== beforeVictoryRun.worldMinute + victory.state.turn) {
    throw new Error(`Encounter return lost its position or time cost: ${JSON.stringify({ beforeMinute: beforeVictoryRun.worldMinute, turns: victory.state.turn, resumed: { progress: resumed.corridorProgress, minute: resumed.worldMinute } })}`);
  }
  if (resumed.vitals.administratorHp !== finalAdministrator?.hp || resumed.vitals.allyHp !== finalAlly?.hp) {
    throw new Error(`Encounter return lost persistent HP: ${JSON.stringify({ combat: { administrator: finalAdministrator?.hp, ally: finalAlly?.hp }, resumed: resumed.vitals })}`);
  }
  await expectCount(page, '.submission-corridor .submission-distance', 1, 'same corridor progress rail');
  if (!(await page.locator('.submission-corridor .submission-distance').innerText()).includes('200 / 400m')) throw new Error('Corridor did not resume at 200 / 400m');
  await expectCount(page, '[data-submission-primary="advance-corridor"][data-primary-key="D"]', 1, 'next corridor movement');
  await page.screenshot({ path: new URL('06-corridor-resumed.png', artifactDir).pathname });

  for (let step = 0; step < 100; step += 1) {
    if ((await submissionSnapshot(page)).mode !== 'CORRIDOR') break;
    await page.keyboard.press('d');
  }
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CENTER_GATE');
  const centerGate = await submissionSnapshot(page);
  if (centerGate.corridorProgress !== 400) throw new Error(`Central gate did not retain 400m progress: ${centerGate.corridorProgress}`);
  const frontierBeforeCenter = centerGate.world.tiles.find((tile) => tile.id === 'frontier-east');
  if (frontierBeforeCenter?.corridorsScouted) throw new Error('Corridors became scouted before the central room was secured');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_SUBMISSION__?.snapshot;
    return snapshot?.mode === 'COMBAT' && snapshot.encounterId === 'CENTER_GUARD' && snapshot.combat?.mode === 'INTRO';
  });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN');
  const beforeCenterCombat = await submissionSnapshot(page);
  await completeCombatToVictory(page, 'central guard');
  await page.waitForTimeout(500);
  const centerVictory = await combatSnapshot(page);
  if (centerVictory.mode !== 'VICTORY') throw new Error(`Central guard did not reach victory: ${centerVictory.mode}`);
  await expectCount(page, '.result-overlay.is-central-scout-gate[data-combat-result="CENTER_SECURED"]', 1, 'scene-first central result');
  await expectCount(page, '.turn-banner-victory,.combat-notice,.result-overlay.is-central-scout-gate h2,.result-overlay.is-central-scout-gate p,.result-overlay.is-central-scout-gate > span:not(.central-secured-origin):not(.result-time-cost)', 0, 'central result title and explanation copy');
  await expectCount(page, '.central-secured-origin,.result-time-cost,[data-combat-primary="reveal-corridors"]', 3, 'central origin, time, and reveal action');
  await expectCount(page, '.enemy-bars .slice2-unit-bar', 0, 'central living enemy bars after victory');
  if (await page.locator('.result-time-cost b').innerText() !== `+${centerVictory.state.turn}`) throw new Error('Central time badge does not match combat turns');
  if (await page.locator('[data-combat-primary="reveal-corridors"] kbd').innerText() !== 'SPACE') throw new Error('Central scouting action does not expose SPACE');
  const stillUnscouted = await submissionSnapshot(page);
  if (stillUnscouted.world.tiles.find((tile) => tile.id === 'frontier-east')?.corridorsScouted) throw new Error('Central result presentation mutated world state before confirmation');
  await assertCriticalFit(page, ['.slice2-combat', '.central-secured-origin', '.result-time-cost', '[data-combat-primary="reveal-corridors"]', '.slice2-party-bars']);
  await page.screenshot({ path: new URL('07-center-secured.png', artifactDir).pathname });

  await page.setViewportSize({ width: 960, height: 720 });
  await assertCriticalFit(page, ['.slice2-combat', '.central-secured-origin', '.result-time-cost', '[data-combat-primary="reveal-corridors"]', '.slice2-party-bars']);
  const centralCompactOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (centralCompactOverflow !== 0) throw new Error(`Compact central result horizontally overflows by ${centralCompactOverflow}px`);
  await page.screenshot({ path: new URL('08-center-secured-4x3.png', artifactDir).pathname });
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'SCOUTED');
  await page.waitForTimeout(900);
  const scouted = await submissionSnapshot(page);
  const scoutedFrontier = scouted.world.tiles.find((tile) => tile.id === 'frontier-east');
  if (!scoutedFrontier || scoutedFrontier.knowledge !== 'SCOUTED' || !scoutedFrontier.corridorsScouted || scoutedFrontier.threat !== 'CONTESTED') {
    throw new Error(`Central victory did not reveal all contested corridors: ${JSON.stringify(scoutedFrontier)}`);
  }
  if (scouted.worldMinute !== beforeCenterCombat.worldMinute + centerVictory.state.turn) {
    throw new Error(`Central combat time did not reach the world clock: ${JSON.stringify({ before: beforeCenterCombat.worldMinute, turns: centerVictory.state.turn, after: scouted.worldMinute })}`);
  }
  await expectCount(page, '[data-scout-map-state="FOUR_CORRIDORS_SCOUTED"]', 1, 'map-first scouted state');
  await expectCount(page, '.scout-center,.scout-policy-hook,[data-submission-primary="review-record"]', 3, 'central cause, policy hook, and next action');
  await expectCount(page, '.scout-line', 4, 'four revealed routes');
  await expectCount(page, '.scout-room', 4, 'four revealed rooms');
  await expectCount(page, '.scout-threat', 2, 'known directional threats');
  await expectCount(page, '.scouted-copy,.scout-causality,.scouted-next', 0, 'retired scouting explanation panels');
  if (await page.locator('[data-submission-primary="review-record"] kbd').innerText() !== 'SPACE') throw new Error('Record review action does not expose SPACE');
  await assertCriticalFit(page, ['.submission-scouted', '.scout-map', '.scout-policy-hook', '[data-submission-primary="review-record"]']);
  await page.screenshot({ path: new URL('09-four-corridors-scouted.png', artifactDir).pathname });
  const textOffStyle2 = await page.addStyleTag({ content: '.submission-scouted .scout-center small,.submission-topbar strong,.submission-topbar small{visibility:hidden!important}' });
  await page.screenshot({ path: new URL('10-four-corridors-text-off.png', artifactDir).pathname });
  await textOffStyle2.evaluate((element) => element.remove());

  await page.setViewportSize({ width: 960, height: 720 });
  await assertCriticalFit(page, ['.submission-scouted', '.scout-map', '.scout-policy-hook', '[data-submission-primary="review-record"]']);
  const scoutedCompactOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (scoutedCompactOverflow !== 0) throw new Error(`Compact scouted map horizontally overflows by ${scoutedCompactOverflow}px`);
  await page.screenshot({ path: new URL('11-four-corridors-scouted-4x3.png', artifactDir).pathname });
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'POLICY_REVIEW');
  const policyInitial = await submissionSnapshot(page);
  const blockedShoot = policyInitial.lastCombatSummary?.blockedByPolicy?.SHOOT;
  const policyEvidence = page.locator('[data-policy-evidence="ADJACENT_SHOOT_BLOCKED"]');
  await expectCount(page, '[data-policy-choice]', 2, 'two spatial policy responses');
  await expectCount(page, '.policy-spatial-lane.is-choice', 2, 'two policy response lanes');
  await expectCount(page, '[data-submission-primary="open-delegation"]', 1, 'single policy continuation action');
  await expectCount(page, '.policy-evidence-focus,.policy-choice-panel h2,.policy-spatial-choices p,.policy-choice-label em', 0, 'retired policy dashboard copy');
  if (Number(await policyEvidence.getAttribute('data-blocked-count')) !== (blockedShoot?.count ?? 0)) throw new Error('Policy record count does not match the last combat summary');
  if (await page.locator('[data-submission-primary="open-delegation"]').isEnabled()) throw new Error('Policy continuation is enabled before a response is chosen');
  if (await page.locator('.policy-order-delta').getAttribute('data-policy-order') !== 'EVADE>POSITION>SHOOT>PUSH>EMPTY') throw new Error('Policy review does not start from the authoritative default order');
  await assertCriticalFit(page, ['.submission-policy-review', '.policy-record-scene', '.policy-spatial-choices', '.policy-order-delta', '[data-submission-primary="open-delegation"]']);
  await page.screenshot({ path: new URL('12-policy-spatial-choice.png', artifactDir).pathname });

  await page.locator('[data-policy-choice="PUSH_FIRST"]').click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.policyChoice === 'PUSH_FIRST');
  let policyChanged = await submissionSnapshot(page);
  if (policyChanged.policy.join('>') !== 'PUSH>EVADE>POSITION>SHOOT>EMPTY' || policyChanged.policyDirectives.keepRange) throw new Error('Pointer PUSH_FIRST did not change the authoritative order');
  await page.keyboard.press('2');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.policyChoice === 'KEEP_RANGE');
  policyChanged = await submissionSnapshot(page);
  if (policyChanged.policy.join('>') !== 'EVADE>POSITION>SHOOT>PUSH>EMPTY' || !policyChanged.policyDirectives.keepRange) throw new Error('Keyboard KEEP_RANGE did not preserve order and add its directive');
  await page.keyboard.press('q');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.policyChoice === 'PUSH_FIRST');
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.policyChoice === 'KEEP_RANGE');
  await expectCount(page, '[data-policy-choice].is-selected', 1, 'one selected policy response');
  await expectCount(page, '.policy-order-row.is-after .policy-symbol.is-changed.has-range-directive', 1, 'one selected policy delta');
  if (!await page.locator('[data-submission-primary="open-delegation"]').isEnabled()) throw new Error('Policy continuation stayed disabled after a response was chosen');
  if (await page.locator('.policy-order-delta').getAttribute('data-policy-directive') !== 'KEEP_RANGE') throw new Error('Visible policy delta lost the keep-range directive');
  await page.screenshot({ path: new URL('13-policy-keep-range.png', artifactDir).pathname });
  const policyTextOff = await page.addStyleTag({ content: '.submission-policy-review .policy-record-fact small,.submission-policy-review .policy-choice-label strong,.submission-policy-review .policy-order-row>small,.submission-topbar strong,.submission-topbar small{visibility:hidden!important}' });
  await page.screenshot({ path: new URL('14-policy-keep-range-text-off.png', artifactDir).pathname });
  await policyTextOff.evaluate((element) => element.remove());

  await page.setViewportSize({ width: 960, height: 720 });
  await assertCriticalFit(page, ['.submission-policy-review', '.policy-record-scene', '.policy-spatial-choices', '.policy-order-delta', '[data-submission-primary="open-delegation"]']);
  const policyCompactOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (policyCompactOverflow !== 0) throw new Error(`Compact policy choice horizontally overflows by ${policyCompactOverflow}px`);
  await page.screenshot({ path: new URL('15-policy-keep-range-4x3.png', artifactDir).pathname });
  await page.setViewportSize({ width: 1280, height: 720 });

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  const report = {
    status: 'ENCOUNTER_TRANSITION_PASS',
    encounter: { id: run.encounterId, progress: run.corridorProgress, party: 2, enemies: revealedEnemyCount },
    reveal: { sceneFirst: true, blockingTitle: false, threatPulse: true, singlePrimaryAction: true, iconAndSpace: true },
    continuity: { sameCombatStage: sameStage, intentAfterReveal: true, responseAfterReveal: true, allyForecastAfterReveal: true },
    compactViewport: { width: 960, height: 720, horizontalOverflow: compactOverflow },
    return: {
      blockingTitle: false,
      pathSecured: true,
      turns: victory.state.turn,
      timeApplied: resumed.worldMinute - beforeVictoryRun.worldMinute,
      persistentHp: resumed.vitals,
      corridorProgress: resumed.corridorProgress,
      nextInput: 'D',
      compactOverflow: resultCompactOverflow,
    },
    centralScouting: {
      blockingTitle: false,
      centerSecured: true,
      corridorsBeforeConfirmation: false,
      corridorsAfterConfirmation: 4,
      knownThreats: 2,
      turns: centerVictory.state.turn,
      timeApplied: scouted.worldMinute - beforeCenterCombat.worldMinute,
      worldState: { knowledge: scoutedFrontier.knowledge, corridorsScouted: scoutedFrontier.corridorsScouted, threat: scoutedFrontier.threat },
      compactResultOverflow: centralCompactOverflow,
      compactMapOverflow: scoutedCompactOverflow,
    },
    policyChoice: {
      recordKind: 'ADJACENT_SHOOT_BLOCKED',
      blockedCount: blockedShoot?.count ?? 0,
      choices: 2,
      pointerPushFirst: true,
      keyboardBindings: ['1/Q', '2/E'],
      selected: 'KEEP_RANGE',
      order: policyChanged.policy,
      keepRange: policyChanged.policyDirectives.keepRange,
      changedSlots: 1,
      compactOverflow: policyCompactOverflow,
    },
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

async function completeCombatToVictory(page, label) {
  for (let step = 0; step < 240; step += 1) {
    const snapshot = await combatSnapshot(page);
    if (!snapshot) throw new Error('Combat snapshot disappeared before path result');
    if (snapshot.mode === 'VICTORY') return;
    if (snapshot.mode === 'DEFEAT') throw new Error(`${label} combat fixture was defeated`);
    if (snapshot.mode !== 'PLAYER_TURN' || snapshot.isBusy) {
      await page.waitForTimeout(35);
      continue;
    }
    await planCombatTurn(page, snapshot);
  }
  throw new Error(`${label} combat did not finish within 240 state steps`);
}

async function planCombatTurn(page, snapshot) {
  for (let decision = 0; decision < 3; decision += 1) {
    snapshot = await combatSnapshot(page);
    const actor = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
    const enemies = snapshot.previewState.units.filter((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
    if (!actor || actor.ap <= 0 || !enemies.length) break;
    const target = enemies.slice().sort((left, right) => manhattan(actor.position, left.position) - manhattan(actor.position, right.position) || left.spawnOrder - right.spawnOrder)[0];
    const picker = page.locator('.target-picker button').filter({ hasText: unitName(target) }).first();
    if (await picker.count()) await picker.click();
    snapshot = await combatSnapshot(page);
    const refreshedActor = snapshot.previewState.units.find((unit) => unit.id === 'administrator-slice2');
    const refreshedTarget = snapshot.previewState.units.find((unit) => unit.id === target.id);
    if (!refreshedActor || !refreshedTarget) break;
    const slam = snapshot.actions.find((action) => action.id === 'SLAM');
    const escape = safestMove(snapshot.previewState, refreshedActor, refreshedTarget);
    const currentGroundDanger = groundDangerAt(snapshot.previewState, refreshedActor.position);
    if (escape && currentGroundDanger > escape.groundDanger) {
      await page.locator('.wasd-grid button').filter({ hasText: escape.key }).click();
      continue;
    }
    if (slam?.executable) {
      await page.locator('.skill-button[data-action-id="SLAM"]').click();
      break;
    }
    const move = refreshedActor.hp <= 2 ? escape?.key : bestMove(snapshot.previewState, refreshedActor, refreshedTarget);
    if (!move) break;
    await page.locator('.wasd-grid button').filter({ hasText: move }).click();
  }
  const execute = page.locator('[data-combat-primary="execute-plan"]');
  if (!await execute.isEnabled()) throw new Error('Encounter return smoke player produced no confirmable plan');
  await execute.click();
  await page.waitForTimeout(40);
}

function safestMove(state, actor, target) {
  return movementCandidates(state, actor)
    .map(([key, position], order) => ({ key, order, danger: dangerAt(state, position), groundDanger: groundDangerAt(state, position), distance: manhattan(position, target.position) }))
    .sort((left, right) => left.groundDanger - right.groundDanger || left.danger - right.danger || left.distance - right.distance || left.order - right.order)[0];
}

function bestMove(state, actor, target) {
  const candidates = movementCandidates(state, actor);
  return candidates
    .map(([key, position], order) => ({ key, order, distance: manhattan(position, target.position), danger: dangerAt(state, position) }))
    .sort((left, right) => left.distance + left.danger * 1.5 - (right.distance + right.danger * 1.5) || left.order - right.order)[0]?.key;
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
function unitName(unit) { if (unit.id.includes('archer')) return '고블린 궁수'; if (unit.id.includes('warrior')) return '고블린 전사'; return '고블린 투척병'; }

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
