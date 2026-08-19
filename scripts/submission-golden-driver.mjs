// Shared product-completion browser driver. Stage flags keep earlier milestone commands reproducible.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_VERIFY_PORT ?? process.env.SUBMISSION_P2_PORT ?? 4183);
const suppliedUrl = process.env.SUBMISSION_VERIFY_URL ?? process.env.SUBMISSION_P2_URL;
const baseUrl = suppliedUrl ?? `http://127.0.0.1:${port}/?verify=1`;
const artifactDir = new URL('../artifacts/submission-golden/', import.meta.url);
const verificationStage = process.env.SUBMISSION_VERIFY_STAGE ?? 'P2';
const verifyP3 = ['P3', 'P4', 'P5'].includes(verificationStage);
const verifyP4 = ['P4', 'P5'].includes(verificationStage);
const verifyP5 = verificationStage === 'P5';
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
  if (verifyP5) await assertPrimaryAction(page, 'advance-prologue', 'D');
  const opening = await submissionSnapshot(page);
  if (opening.mode !== 'AWAKENING' || opening.companionJoined || await page.locator('.submission-topbar').count() || await page.locator('img[alt="원거리 동료"]').count()) {
    throw new Error(`Opening is not an authoritative solo awakening: ${JSON.stringify({ mode: opening.mode, companionJoined: opening.companionJoined })}`);
  }
  await capture(page, '00-awakening');
  await advancePrologueUntilCombat(page);
  let run = await submissionSnapshot(page);
  const soloStudents = run.combat?.state.units.filter((unit) => unit.faction === 'STUDENT') ?? [];
  if (run.mode !== 'COMBAT' || run.encounterId !== 'SOLO_WARRIOR' || run.prologueProgress !== 100 || soloStudents.length !== 1 || soloStudents[0].visualKey !== 'administrator_submission_01') {
    throw new Error(`Prologue did not enter the fixed solo encounter: ${JSON.stringify({ mode: run.mode, encounterId: run.encounterId, progress: run.prologueProgress, soloStudents })}`);
  }
  await capture(page, '01-solo-encounter');
  let firstInputFeedback;
  if (verifyP5) firstInputFeedback = await verifyFirstCombatInput(page);
  const soloCombat = await completeCurrentCombat(page);
  run = await submissionSnapshot(page);
  if (run.mode !== 'COMPANION_SEALED' || !run.soloEncounterResolved || run.companionJoined) {
    throw new Error(`Solo victory did not reveal a sealed companion: ${JSON.stringify(pickRunState(run))}`);
  }
  if (verifyP5) await assertPrimaryAction(page, 'release-companion', 'SPACE');
  if (await page.locator('.submission-companion.is-sealed .companion-archer').count() !== 1) throw new Error('Sealed companion is not visible in the world');
  await capture(page, '02-companion-sealed');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMPANION_JOINED');
  run = await submissionSnapshot(page);
  if (!run.companionJoined || await page.locator('.submission-topbar').count() !== 1 || await page.locator('img[alt="원거리 동료"]').count() !== 1) {
    throw new Error(`Companion join did not unlock party presentation: ${JSON.stringify({ joined: run.companionJoined })}`);
  }
  if (verifyP5) await assertPrimaryAction(page, 'depart-with-companion', 'D');
  await capture(page, '03-companion-joined');
  const expeditionMinute = run.worldMinute;
  await page.keyboard.press('d');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'CORRIDOR');
  if (verifyP5) await assertPrimaryAction(page, 'advance-corridor', 'D');

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
  run = await submissionSnapshot(page);
  if (run.mode !== 'COMBAT' || run.encounterId !== 'FIRST_WARRIOR' || run.corridorProgress !== 200 || run.worldMinute !== expeditionMinute + 4) {
    throw new Error(`First spatial encounter did not stop at 200m: ${JSON.stringify(pickRunState(run))}`);
  }
  if (run.combat.state.units.filter((unit) => unit.faction === 'STUDENT').length !== 2) throw new Error('First joint encounter does not contain the joined companion');
  if (verifyP5) {
    if (await page.locator('.encounter-overlay.is-seamless[data-encounter-transition="THREAT_REVEALED"]').count() !== 1) throw new Error('First joint encounter does not remain a scene-first reveal');
    if (await page.locator('.encounter-title,.encounter-overlay.is-seamless h1,.encounter-overlay.is-seamless p').count()) throw new Error('First joint encounter is blocked by a title card');
    if (await page.locator('[data-combat-primary="start-encounter"]').count() !== 1) throw new Error('First joint encounter does not expose one combat start action');
  }
  await capture(page, '02-first-encounter');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot?.mode === 'PLAYER_TURN');
  if (!(await combatSnapshot(page)).allyIntent) throw new Error('Joined companion does not expose a deterministic action preview');
  const firstCombat = await completeCurrentCombat(page);
  run = await submissionSnapshot(page);
  if (run.mode !== 'CORRIDOR' || run.corridorProgress !== 200) throw new Error(`First combat did not resume the same corridor position: ${JSON.stringify(pickRunState(run))}`);

  await advanceCorridorUntil(page, 400);
  run = await submissionSnapshot(page);
  if (run.mode !== 'CENTER_GATE' || run.corridorProgress !== 400 || run.worldMinute !== expeditionMinute + 8 + firstCombat.turns) {
    throw new Error(`Central room gate was not reached at 400m: ${JSON.stringify(pickRunState(run))}`);
  }
  if (verifyP5) await assertPrimaryAction(page, 'enter-center', 'SPACE');
  await capture(page, '03-center-gate');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'COMBAT');
  run = await submissionSnapshot(page);
  if (run.encounterId !== 'CENTER_GUARD') throw new Error(`Unexpected central encounter: ${run.encounterId}`);
  const centerCombat = await completeCurrentCombat(page);

  run = await submissionSnapshot(page);
  if (run.mode !== 'SCOUTED') throw new Error(`P2 did not reach SCOUTED: ${JSON.stringify(pickRunState(run))}`);
  await page.waitForTimeout(900);
  const frontier = run.world.tiles.find((tile) => tile.id === 'frontier-east');
  if (!frontier || frontier.knowledge !== 'SCOUTED' || !frontier.corridorsScouted || frontier.threat !== 'CONTESTED') {
    throw new Error(`Central victory did not scout all corridors without falsely securing them: ${JSON.stringify(frontier)}`);
  }
  if (await page.locator('[data-scout-map-state="FOUR_CORRIDORS_SCOUTED"] .scout-room').count() !== 4 || await page.locator('.scout-center').count() !== 1) {
    throw new Error('Scouting result does not render one central room and four connected rooms');
  }
  if (await page.locator('.scout-line').count() !== 4 || await page.locator('.scout-threat').count() !== 2 || await page.locator('.scout-policy-hook').count() !== 1) {
    throw new Error('Scouting result does not connect four routes, known threats, and the observed policy problem');
  }
  if (await page.locator('.scouted-copy,.scout-causality,.scouted-next').count() !== 0) {
    throw new Error('Scouting result regressed to explanation-first panels');
  }
  if (verifyP5) await assertPrimaryAction(page, 'review-record', 'SPACE');
  await capture(page, '04-scouted');

  let delegationReport;
  let expansionReport;
  if (verifyP3) {
    const scoutedMinute = run.worldMinute;
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'POLICY_REVIEW');
    const evidenceText = await page.locator('.policy-evidence-focus').innerText();
    if (!evidenceText.includes('ACTUAL RECORD') || !evidenceText.includes('사격 판정') || !evidenceText.includes('유효 사거리')) {
      throw new Error(`Policy review is not grounded in the previous combat record: ${evidenceText}`);
    }
    if (verifyP5) await assertPrimaryAction(page, 'open-delegation', 'SPACE', false);
    await page.locator('.policy-choice-list button').filter({ hasText: '사격 거리를 계속 지킨다' }).click();
    let policyRun = await submissionSnapshot(page);
    if (policyRun.policyChoice !== 'KEEP_RANGE' || policyRun.policyDirectives.keepRange !== true) {
      throw new Error('Keep-range choice did not change the spatial directive');
    }
    if (verifyP5) await assertPrimaryAction(page, 'open-delegation', 'SPACE');
    await capture(page, '06-policy-review');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'DELEGATION_PLAN');
    const planText = await page.locator('.delegation-orders').innerText();
    if (!planText.includes('400m') || !planText.includes('HP 2 이하') || !planText.includes('전투 12턴') || !planText.includes('즉시 Decision') || !planText.includes('보급') || !planText.includes('사용 안 함')) {
      throw new Error(`Delegation plan omits route or stop conditions: ${planText}`);
    }
    if (await page.locator('.route-threat').count() !== 2) throw new Error('Known route does not expose both observed enemies');
    if (verifyP5) await assertPrimaryAction(page, 'run-delegation', 'SPACE');
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
    if (verifyP5) await assertPrimaryAction(page, 'review-policy', 'SPACE');
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
    if (verifyP5) await assertPrimaryAction(page, 'approach-anchor', 'SPACE');
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

    if (verifyP4) {
      const beforeAnchorMinute = run.worldMinute;
      const waterBefore = run.supplies.water;
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'ANCHOR_APPROACH');
      if (verifyP5) await assertPrimaryAction(page, 'approach-anchor', 'D');
      const beforeAnchorTravel = await anchorPresentation(page);
      await page.keyboard.press('d');
      await page.waitForTimeout(100);
      const afterAnchorTravel = await anchorPresentation(page);
      if (beforeAnchorTravel.partyX !== afterAnchorTravel.partyX) {
        throw new Error(`Protagonist drifted during safe-route travel: ${beforeAnchorTravel.partyX} → ${afterAnchorTravel.partyX}`);
      }
      if (beforeAnchorTravel.backdropPosition === afterAnchorTravel.backdropPosition || beforeAnchorTravel.groundPosition === afterAnchorTravel.groundPosition) {
        throw new Error('Safe-route world did not move behind the protagonist');
      }
      await capture(page, '12-anchor-approach');
      await advanceAnchorUntil(page, 400);
      run = await submissionSnapshot(page);
      const readyFrontier = run.world.tiles.find((tile) => tile.id === 'frontier-east');
      if (run.mode !== 'ANCHOR_READY' || run.anchorProgress !== 400 || !readyFrontier?.protagonistAtAnchor || readyFrontier.territory !== 'OUTSIDE') {
        throw new Error(`Protagonist arrival skipped or prematurely incorporated the tile: ${JSON.stringify({ mode: run.mode, progress: run.anchorProgress, readyFrontier })}`);
      }
      if (run.worldMinute !== beforeAnchorMinute + 8) throw new Error(`400m anchor travel did not cost 8 minutes: ${beforeAnchorMinute} → ${run.worldMinute}`);
      if (verifyP5) {
        await assertPrimaryAction(page, 'activate-anchor', 'SPACE');
        await assertKoreanFonts(page);
      }
      await capture(page, '13-anchor-ready');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'EXPANDED');
      await page.waitForTimeout(1100);
      run = await submissionSnapshot(page);
      const expandedFrontier = run.world.tiles.find((tile) => tile.id === 'frontier-east');
      const revealed = run.world.tiles.filter((tile) => ['next-east', 'frontier-north', 'frontier-south'].includes(tile.id));
      if (!expandedFrontier || expandedFrontier.territory !== 'INCORPORATED' || expandedFrontier.utility !== 'ACTIVE' || !expandedFrontier.stabilized) {
        throw new Error(`Anchor activation did not incorporate and stabilize the frontier: ${JSON.stringify(expandedFrontier)}`);
      }
      if (revealed.length !== 3 || revealed.some((tile) => tile.knowledge !== 'REVEALED')) {
        throw new Error(`Anchor activation did not reveal all next coordinates: ${JSON.stringify(revealed)}`);
      }
      if (run.supplies.water !== waterBefore + 1) throw new Error(`Active spring did not add exactly one water: ${waterBefore} → ${run.supplies.water}`);
      if (await page.locator('.expanded-tile-field .barrier-edge').count() !== 6) throw new Error('Expanded contour does not have the joined six-edge outline');
      if (await page.locator('.active-spring').count() !== 1 || await page.locator('.expansion-causality span').count() !== 4) {
        throw new Error('Final scene does not connect route, protagonist, contour, and spring');
      }
      const stateLedger = await page.locator('.expansion-state-ledger').innerText();
      const nextExpedition = await page.locator('.next-coordinates').innerText();
      if (await page.locator('.expansion-state-ledger span').count() !== 3 || !stateLedger.includes('소속') || !stateLedger.includes('안정') || !stateLedger.includes('효용')) {
        throw new Error(`Final scene does not separate territory, stability, and utility: ${stateLedger}`);
      }
      if (!nextExpedition.includes('WATER +1') || !nextExpedition.includes('다음 원정 한 번')) {
        throw new Error(`Spring reward is not connected to next expedition capacity: ${nextExpedition}`);
      }
      if (verifyP5) {
        await assertPrimaryAction(page, 'restart-submission', 'SPACE');
        await assertKoreanFonts(page);
      }
      await capture(page, '14-expanded');
      expansionReport = {
        mode: run.mode,
        anchorTravelMinutes: run.worldMinute - beforeAnchorMinute,
        contourEdges: 6,
        territory: expandedFrontier.territory,
        utility: expandedFrontier.utility,
        stabilized: expandedFrontier.stabilized,
        waterBefore,
        waterAfter: run.supplies.water,
        revealedCoordinates: revealed.map((tile) => tile.id),
      };
    }
  }

  await page.setViewportSize({ width: 960, height: 720 });
  await page.waitForTimeout(100);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (horizontalOverflow > 1) throw new Error(`4:3 scouted layout overflows horizontally by ${horizontalOverflow}px`);
  await capture(page, verifyP4 ? '15-expanded-4x3' : verifyP3 ? '11-delegation-result-4x3' : '05-scouted-4x3');
  let interactionGate;
  if (verifyP5) {
    const criticalFit = await assertCriticalFit(page);
    await assertPrimaryAction(page, 'restart-submission', 'SPACE');
    await page.locator('[data-submission-primary="restart-submission"]').click();
    await page.waitForFunction(() => window.__ISEKAI_COACH_SUBMISSION__?.snapshot.mode === 'AWAKENING');
    const restarted = await submissionSnapshot(page);
    if (restarted.worldTime !== '10:00' || restarted.supplies.water !== 1 || restarted.corridorProgress !== 0) {
      throw new Error(`Restart did not restore a clean submission state: ${JSON.stringify(restarted)}`);
    }
    await assertPrimaryAction(page, 'advance-prologue', 'D');
    interactionGate = { singlePrimaryAction: true, keyboardRoute: true, pointerRestart: true, criticalFit };
  }
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
    prologue: { solo: true, companionJoined: true, soloCombat },
    combat: { first: firstCombat, center: centerCombat },
    partyAnchored: beforeTravel.partyX === afterTravel.partyX,
    worldScrolled: beforeTravel.backdropPosition !== afterTravel.backdropPosition && beforeTravel.groundPosition !== afterTravel.groundPosition,
    centralRoomCausality: true,
    ...(delegationReport ? { delegation: delegationReport } : {}),
    ...(expansionReport ? { expansion: expansionReport } : {}),
    horizontalOverflow4x3: horizontalOverflow,
    ...(interactionGate ? { interactionGate } : {}),
    ...(firstInputFeedback ? { firstInputFeedback } : {}),
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

async function advancePrologueUntilCombat(page) {
  for (let step = 0; step < 25; step += 1) {
    const run = await submissionSnapshot(page);
    if (run.mode === 'COMBAT') return;
    if (run.mode !== 'AWAKENING' && run.mode !== 'SOLO_APPROACH') throw new Error(`Expected prologue travel, got ${run.mode}`);
    await page.keyboard.press('d');
  }
  throw new Error('Prologue did not reach the fixed solo encounter');
}

async function advanceAnchorUntil(page, meters) {
  for (let step = 0; step < 100; step += 1) {
    const run = await submissionSnapshot(page);
    if (run.mode !== 'ANCHOR_APPROACH' || run.anchorProgress >= meters) return;
    await page.keyboard.press('d');
  }
  throw new Error(`Anchor approach failed to reach ${meters}m`);
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

async function verifyFirstCombatInput(page) {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && !snapshot.isBusy;
  });
  const combat = await combatSnapshot(page);
  const actor = combat.previewState.units.find((unit) => unit.id === 'administrator-slice2');
  const target = combat.previewState.units.find((unit) => unit.faction === 'ENEMY' && unit.hp > 0);
  if (!actor || !target) throw new Error('First combat input gate cannot find actor and target');
  // The opening encounter is fixed: W is its authored safe learning move. A generic
  // pre-move danger score cannot predict the enemy intent after it adapts to the move.
  const move = 'W';
  if (await page.locator('.solo-combat-guide.is-threat').count() !== 1) throw new Error('First combat does not focus the player on the threat-to-movement relation');
  if (await page.locator('.solo-learning-controls .skill-button,.solo-learning-controls .plan-strip').count() !== 0) throw new Error('First combat exposes later vocabulary before the first movement');
  const movementButton = page.locator('.wasd-grid button').filter({ hasText: move });
  if (!await movementButton.isEnabled()) throw new Error('Authored safe first movement W is unavailable');
  await movementButton.click();
  await page.waitForFunction(() => window.__ISEKAI_COACH_COMBAT__?.snapshot.inputFeedback?.kind === 'ACCEPTED');
  const feedback = await page.locator('.solo-input-feedback.is-accepted').innerText();
  const outcome = await page.locator('.solo-learning-controls.is-outcome .solo-outcome-token').count();
  const execute = await page.locator('[data-onboarding-primary="execute-plan"]').count();
  if (!feedback || outcome !== 1 || execute !== 1) {
    throw new Error(`First input lacks accepted feedback or result-to-execute cue: ${JSON.stringify({ feedback, outcome, execute })}`);
  }
  await page.locator('[data-onboarding-primary="execute-plan"]').click();
  await page.waitForFunction(() => {
    const snapshot = window.__ISEKAI_COACH_COMBAT__?.snapshot;
    return snapshot?.mode === 'PLAYER_TURN' && !snapshot.isBusy && snapshot.state.turn >= 2;
  });
  return { accepted: true, pointerAction: move, nextKey: 'SPACE', feedback };
}

async function playPlayerTurn(page, snapshot) {
  if (snapshot.state.turn === 1 && await page.locator('.solo-learning-controls').count()) {
    const authoredMove = page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' });
    if (!await authoredMove.isEnabled()) throw new Error('Solo smoke player cannot use its authored W movement');
    await authoredMove.click();
    const execute = page.locator('[data-onboarding-primary="execute-plan"]');
    if (!await execute.isEnabled()) throw new Error('Solo smoke player did not produce a safe confirmable movement');
    await execute.click();
    await page.waitForTimeout(40);
    return;
  }
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
async function anchorPresentation(page) {
  return page.evaluate(() => {
    const party = document.querySelector('.anchor-travel-party')?.getBoundingClientRect();
    const backdrop = document.querySelector('.submission-anchor-approach .corridor-moving-backdrop');
    const ground = document.querySelector('.submission-anchor-approach .corridor-moving-ground');
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

async function assertPrimaryAction(page, actionId, key, enabled = true) {
  const actions = page.locator('[data-submission-primary]');
  if (await actions.count() !== 1) throw new Error(`Expected one primary action for ${actionId}, found ${await actions.count()}`);
  const action = actions.first();
  const actualId = await action.getAttribute('data-submission-primary');
  const actualKey = await action.getAttribute('data-primary-key');
  if (actualId !== actionId || actualKey !== key) throw new Error(`Primary action mismatch: expected ${actionId}/${key}, got ${actualId}/${actualKey}`);
  if (await action.isEnabled() !== enabled) throw new Error(`Primary action ${actionId} enabled=${await action.isEnabled()}, expected ${enabled}`);
}

async function assertKoreanFonts(page) {
  const invalid = await page.locator('[data-korean-critical]').evaluateAll((elements) => elements.flatMap((element) => {
    const family = getComputedStyle(element).fontFamily;
    return family.includes('Pretendard') ? [] : [`${element.textContent?.trim()}: ${family}`];
  }));
  if (invalid.length) throw new Error(`Critical Korean copy lost its readable fallback: ${invalid.join(' | ')}`);
}

async function assertCriticalFit(page) {
  const result = await page.locator('[data-critical-fit]').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      label: element.getAttribute('data-submission-primary') ?? element.className,
      left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      width: rect.width, height: rect.height,
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
    };
  }));
  const invalid = result.filter((rect) => rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.top < -1 || rect.right > rect.viewportWidth + 1 || rect.bottom > rect.viewportHeight + 1);
  if (invalid.length) throw new Error(`Critical content is outside the viewport: ${JSON.stringify(invalid)}`);
  return result.map(({ label, width, height }) => ({ label, width: Math.round(width), height: Math.round(height) }));
}
