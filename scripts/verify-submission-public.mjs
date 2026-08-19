import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const publicBase = process.env.SUBMISSION_PUBLIC_URL ?? 'https://openai.ktwome.cc';
const artifactDir = new URL('../artifacts/submission-public/', import.meta.url);
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 960, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  observeErrors(page, errors);

  await page.goto(`${publicBase}/`, { waitUntil: 'networkidle' });
  if (await page.title() !== '결계의 바깥') throw new Error(`Public root title mismatch: ${await page.title()}`);
  const start = page.locator('[data-submission-primary="advance-prologue"]');
  if (await start.count() !== 1 || await start.getAttribute('data-primary-key') !== 'D') throw new Error('Public awakening movement is missing');
  if (await page.locator('.submission-topbar,.submission-prologue h1,.submission-prologue p,img[alt="원거리 동료"]').count()) {
    throw new Error('Public opening leaks future party state or explanatory copy');
  }
  await page.screenshot({ path: new URL('00-public-root.png', artifactDir).pathname });
  const characterBefore = await page.locator('.prologue-protagonist').evaluate((element) => element.getBoundingClientRect().x);
  await start.dispatchEvent('pointerdown');
  await page.waitForTimeout(130);
  await start.dispatchEvent('pointerup');
  const characterAfter = await page.locator('.prologue-protagonist').evaluate((element) => element.getBoundingClientRect().x);
  const checkpointBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('isekai-coach:submission:v2') ?? 'null'));
  if (characterAfter <= characterBefore || checkpointBeforeReload?.prologueProgress <= 0) {
    throw new Error(`Public pointer movement was not accepted: ${JSON.stringify({ characterBefore, characterAfter, checkpointBeforeReload })}`);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.submission-prologue').waitFor();
  const checkpointAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('isekai-coach:submission:v2') ?? 'null'));
  if (checkpointAfterReload?.prologueProgress !== checkpointBeforeReload.prologueProgress) {
    throw new Error(`Public checkpoint restore mismatch: ${checkpointBeforeReload?.prologueProgress} → ${checkpointAfterReload?.prologueProgress}`);
  }
  await page.screenshot({ path: new URL('01-public-restored.png', artifactDir).pathname });

  for (let step = 0; step < 24 && await page.locator('.encounter-overlay.is-prologue').count() === 0; step += 1) {
    await page.keyboard.press('d');
  }
  await page.locator('.encounter-overlay.is-prologue').waitFor();
  await page.keyboard.press('Space');
  await page.locator('.solo-learning-controls.is-threat').waitFor();
  if (await page.locator('.solo-learning-controls .skill-button,.solo-learning-controls .plan-strip,[data-onboarding-primary]').count()) {
    throw new Error('Public first combat exposes later vocabulary before movement');
  }
  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'A' }).click();
  await page.locator('[data-onboarding-primary="revise-plan"]').waitFor();
  await page.keyboard.press('Space');
  if (await page.locator('[data-onboarding-primary="revise-plan"]').count() !== 1) throw new Error('Public unsafe preview accepted Space');
  await page.locator('[data-onboarding-primary="revise-plan"]').click();
  await page.locator('.solo-learning-controls .wasd-grid button').filter({ hasText: 'W' }).click();
  await page.locator('[data-onboarding-primary="execute-plan"]').waitFor();
  await page.screenshot({ path: new URL('02-public-solo-plan.png', artifactDir).pathname });
  await page.locator('[data-onboarding-primary="execute-plan"]').click();
  await page.locator('.submission-action-dock:not(.is-busy)[data-decision-focus="INPUT"]').waitFor({ timeout: 60_000 });
  if (await page.locator('.turn-banner-player_turn,.submission-action-dock .target-picker,.submission-action-dock .skill-tooltip:visible').count()) {
    throw new Error('Public normal combat hierarchy regressed');
  }
  await page.screenshot({ path: new URL('03-public-normal-combat.png', artifactDir).pathname });
  const publicSlam = page.locator('.submission-action-dock .skill-button[data-action-id="SLAM"][data-executable="true"]');
  if (!await publicSlam.count()) throw new Error('Public solo combat cannot finish its authored second turn');
  await publicSlam.click();
  await page.locator('[data-combat-primary="execute-plan"]').click();
  await page.locator('.result-overlay').waitFor({ timeout: 30_000 });
  await page.keyboard.press('Space');
  await page.locator('[data-submission-primary="release-companion"]').waitFor();
  await page.keyboard.press('Space');
  await page.locator('[data-submission-primary="depart-with-companion"]').waitFor();
  await page.keyboard.press('d');
  await page.locator('.submission-corridor').waitFor();
  for (let step = 0; step < 100 && await page.locator('.encounter-overlay:not(.is-prologue)').count() === 0; step += 1) {
    await page.keyboard.press('d');
  }
  const publicEncounterGate = page.locator('.encounter-overlay.is-seamless[data-encounter-transition="THREAT_REVEALED"]');
  await publicEncounterGate.waitFor();
  if (await page.locator('.encounter-title,.encounter-overlay.is-seamless h1,.encounter-overlay.is-seamless p').count()) {
    throw new Error('Public first joint encounter restored its blocking title card');
  }
  if (await publicEncounterGate.locator('[data-combat-primary="start-encounter"] img,kbd').count() !== 2) {
    throw new Error('Public encounter gate lacks its icon and SPACE action');
  }
  await page.keyboard.press('Space');
  const publicAllyForecast = page.locator('.ally-intent-panel.is-policy-linked[data-forecast-basis="CURRENT"]');
  await publicAllyForecast.waitFor({ timeout: 30_000 });
  if (await publicAllyForecast.locator('.ally-forecast-token[data-policy-rank][data-policy-id]').count() === 0 || await publicAllyForecast.getAttribute('open') !== null) {
    throw new Error('Public ally forecast lacks policy source or opens detail by default');
  }
  await page.screenshot({ path: new URL('04-public-ally-policy.png', artifactDir).pathname });
  const beforeJointMinute = Number(await page.locator('.slice2-combat').getAttribute('data-world-minute'));
  if (!Number.isFinite(beforeJointMinute)) throw new Error('Public combat does not expose its current world minute');
  await completePublicCombat(page, '.result-overlay.is-seamless-path', 'first joint', 16);
  const publicPathResult = page.locator('.result-overlay.is-seamless-path[data-combat-result="PATH_SECURED"]');
  await publicPathResult.waitFor({ timeout: 90_000 });
  if (await page.locator('.turn-banner-victory,.combat-notice,.result-overlay.is-seamless-path h2,.result-overlay.is-seamless-path p').count()) {
    throw new Error('Public path result restored duplicate victory explanation');
  }
  const publicBattleMinutes = Number((await page.locator('.result-time-cost b').innerText()).replace('+', ''));
  if (!Number.isFinite(publicBattleMinutes) || publicBattleMinutes <= 0 || await page.locator('[data-combat-primary="resume-corridor"] kbd').innerText() !== 'SPACE') {
    throw new Error('Public path result lacks its time cost or resume action');
  }
  await page.screenshot({ path: new URL('05-public-path-secured.png', artifactDir).pathname });
  await page.keyboard.press('Space');
  await page.locator('.submission-corridor .submission-distance').waitFor();
  const afterJointSave = await savedSubmission(page);
  if (!afterJointSave?.firstEncounterResolved || afterJointSave.corridorProgress !== 200 || afterJointSave.worldMinute !== beforeJointMinute + publicBattleMinutes) {
    throw new Error(`Public encounter return lost progress or time: ${JSON.stringify({ beforeJointMinute, publicBattleMinutes, afterJointSave })}`);
  }
  if (!(await page.locator('.submission-corridor .submission-distance').innerText()).includes('200 / 400m')) throw new Error('Public corridor did not resume at 200 / 400m');
  await page.screenshot({ path: new URL('06-public-corridor-resumed.png', artifactDir).pathname });

  for (let step = 0; step < 100 && await page.locator('[data-submission-primary="enter-center"]').count() === 0; step += 1) {
    await page.keyboard.press('d');
  }
  const publicCenterGate = page.locator('[data-submission-primary="enter-center"][data-primary-key="SPACE"]');
  await publicCenterGate.waitFor();
  const beforeCenterSave = await savedSubmission(page);
  const beforeCenterFrontier = beforeCenterSave?.world?.tiles?.find((tile) => tile.id === 'frontier-east');
  if (beforeCenterSave?.corridorProgress !== 400 || beforeCenterFrontier?.corridorsScouted) {
    throw new Error(`Public central gate has premature scouting state: ${JSON.stringify({ progress: beforeCenterSave?.corridorProgress, frontier: beforeCenterFrontier })}`);
  }
  await page.keyboard.press('Space');
  const centralEncounterGate = page.locator('.encounter-overlay.is-seamless[data-encounter-transition="THREAT_REVEALED"]');
  await centralEncounterGate.waitFor();
  await page.keyboard.press('Space');
  await page.locator('.submission-action-dock:not(.is-busy)').waitFor({ timeout: 30_000 });
  const beforeCenterMinute = Number(await page.locator('.slice2-combat').getAttribute('data-world-minute'));
  if (!Number.isFinite(beforeCenterMinute)) throw new Error('Public central combat does not expose its current world minute');
  await completePublicCombat(page, '.result-overlay.is-central-scout-gate', 'central guard', 24);
  const publicCenterResult = page.locator('.result-overlay.is-central-scout-gate[data-combat-result="CENTER_SECURED"]');
  await publicCenterResult.waitFor({ timeout: 90_000 });
  if (await page.locator('.turn-banner-victory,.combat-notice,.result-overlay.is-central-scout-gate h2,.result-overlay.is-central-scout-gate p').count()) {
    throw new Error('Public central result restored duplicate victory explanation');
  }
  const publicCenterMinutes = Number((await publicCenterResult.locator('.result-time-cost b').innerText()).replace('+', ''));
  if (!Number.isFinite(publicCenterMinutes) || publicCenterMinutes <= 0 || await page.locator('[data-combat-primary="reveal-corridors"] kbd').innerText() !== 'SPACE') {
    throw new Error('Public central result lacks its time cost or corridor reveal action');
  }
  const beforeCenterConfirmation = await savedSubmission(page);
  if (beforeCenterConfirmation?.world?.tiles?.find((tile) => tile.id === 'frontier-east')?.corridorsScouted) {
    throw new Error('Public central result mutated scouting state before SPACE');
  }
  await page.screenshot({ path: new URL('07-public-center-secured.png', artifactDir).pathname });
  await page.keyboard.press('Space');
  await page.locator('[data-scout-map-state="FOUR_CORRIDORS_SCOUTED"]').waitFor();
  await page.waitForTimeout(900);
  const afterCenterSave = await savedSubmission(page);
  const afterCenterFrontier = afterCenterSave?.world?.tiles?.find((tile) => tile.id === 'frontier-east');
  if (afterCenterSave?.worldMinute !== beforeCenterMinute + publicCenterMinutes || !afterCenterFrontier?.corridorsScouted || afterCenterFrontier.knowledge !== 'SCOUTED' || afterCenterFrontier.threat !== 'CONTESTED') {
    throw new Error(`Public central scouting lost time or world state: ${JSON.stringify({ beforeCenterMinute, publicCenterMinutes, afterCenterSave, afterCenterFrontier })}`);
  }
  if (await page.locator('.scout-line').count() !== 4 || await page.locator('.scout-room').count() !== 4 || await page.locator('.scout-threat').count() !== 2 || await page.locator('.scout-policy-hook').count() !== 1) {
    throw new Error('Public scouted scene lost its four routes, known threats, or policy hook');
  }
  if (await page.locator('.scouted-copy,.scout-causality,.scouted-next').count() || await page.locator('[data-submission-primary="review-record"][data-primary-key="SPACE"]').count() !== 1) {
    throw new Error('Public scouted scene restored explanation panels or lost its single next action');
  }
  await page.screenshot({ path: new URL('08-public-four-corridors-scouted.png', artifactDir).pathname });

  await page.keyboard.press('Space');
  await page.locator('[data-policy-evidence="ADJACENT_SHOOT_BLOCKED"]').waitFor();
  if (await page.locator('[data-policy-choice]').count() !== 2 || await page.locator('.policy-spatial-lane.is-choice').count() !== 2) {
    throw new Error('Public policy review lost its two spatial response choices');
  }
  const publicPolicyPrimary = page.locator('[data-submission-primary="open-delegation"]');
  if (await publicPolicyPrimary.isEnabled()) throw new Error('Public policy continuation is enabled before a choice');
  await page.keyboard.press('2');
  await page.locator('[data-policy-choice="KEEP_RANGE"].is-selected').waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('isekai-coach:submission:v2') ?? 'null')?.policyChoice === 'KEEP_RANGE');
  const publicPolicySave = await savedSubmission(page);
  if (publicPolicySave?.policyChoice !== 'KEEP_RANGE' || publicPolicySave?.policy?.join('>') !== 'EVADE>POSITION>SHOOT>PUSH>EMPTY' || !publicPolicySave?.policyDirectives?.keepRange) {
    throw new Error(`Public policy shortcut did not set authoritative keep-range state: ${JSON.stringify(publicPolicySave)}`);
  }
  if (!await publicPolicyPrimary.isEnabled() || await page.locator('.policy-order-row.is-after .is-changed.has-range-directive').count() !== 1) {
    throw new Error('Public policy choice lacks selected feedback or exact changed slot');
  }
  await page.screenshot({ path: new URL('09-public-policy-spatial-choice.png', artifactDir).pathname });

  await page.keyboard.press('Space');
  await page.locator('.submission-delegation-plan.is-map-first[data-delegation-policy="KEEP_RANGE"]').waitFor();
  const publicDelegationSave = await savedSubmission(page);
  const publicDelegation = page.locator('.submission-delegation-plan.is-map-first');
  const publicStopStrip = page.locator('.delegation-stop-strip');
  const publicParallelTime = page.locator('.delegation-parallel-time');
  if (await publicDelegation.getAttribute('data-route-distance') !== '400'
    || await publicDelegation.getAttribute('data-route-travel-minutes') !== '8'
    || await publicDelegation.getAttribute('data-known-threats') !== '2'
    || await page.locator('.delegation-route .route-party').count() !== 1
    || await page.locator('.delegation-route .route-threat').count() !== 2
    || await page.locator('.delegation-route .route-goal').count() !== 1) {
    throw new Error('Public delegation route lost its selected policy, distance, party, known threats, or boundary room');
  }
  if (await page.locator('[data-stop-condition]').count() !== 3
    || await page.locator('[data-supply-use="0"]').count() !== 1
    || Number(await publicStopStrip.getAttribute('data-retreat-at-hp')) !== publicDelegationSave?.retreatAtHp
    || await publicStopStrip.getAttribute('data-turn-limit') !== '12') {
    throw new Error('Public delegation plan lost an authoritative stop or supply rule');
  }
  if (await publicParallelTime.getAttribute('data-time-rule') !== 'MAX_NOT_SUM'
    || Number(await publicParallelTime.getAttribute('data-protagonist-minutes')) !== publicDelegationSave?.protagonistTaskMinutes
    || await publicParallelTime.getAttribute('data-ally-travel-minutes') !== '8'
    || publicDelegationSave?.protagonistTaskMinutes !== 5) {
    throw new Error('Public delegation plan lost its concurrent 5-minute and 8-minute schedule');
  }
  if (await page.locator('.delegation-heading,.delegation-orders,.concurrent-task,.submission-delegation-plan h1,.submission-delegation-plan p').count()
    || await page.locator('[data-submission-primary="run-delegation"][data-primary-key="SPACE"]').count() !== 1) {
    throw new Error('Public delegation plan restored dashboard copy or lost its single start action');
  }
  const publicDelegationLayout = await page.locator('.delegation-route,.delegation-stop-strip,.delegation-parallel-time,[data-submission-primary="run-delegation"]').evaluateAll((elements) => ({
    viewport: { width: innerWidth, height: innerHeight },
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bounds: elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }),
  }));
  if (publicDelegationLayout.bounds.some((box) => box.left < -1 || box.top < -1 || box.right > publicDelegationLayout.viewport.width + 1 || box.bottom > publicDelegationLayout.viewport.height + 1)
    || publicDelegationLayout.overflow > 1) {
    throw new Error(`Public delegation plan does not fit 4:3: ${JSON.stringify(publicDelegationLayout)}`);
  }
  await page.screenshot({ path: new URL('10-public-delegation-route-plan.png', artifactDir).pathname });

  const regression = {};
  for (const [path, expectedTitle] of [['slice1', 'Slice1'], ['slice2', 'Slice2']]) {
    const regressionPage = await context.newPage();
    observeErrors(regressionPage, errors);
    await regressionPage.goto(`${publicBase}/${path}/`, { waitUntil: 'networkidle' });
    const title = await regressionPage.title();
    if (title !== expectedTitle) throw new Error(`/${path}/ title mismatch: ${title}`);
    if (await regressionPage.locator('#root').count() !== 1) throw new Error(`/${path}/ root missing`);
    regression[path] = { title, root: true };
    await regressionPage.close();
  }
  if (errors.length) throw new Error(`Public browser errors:\n${errors.join('\n')}`);

  const report = {
    status: 'PUBLIC_BROWSER_PASS',
    publicBase,
    title: await page.title(),
    primaryAction: 'advance-prologue',
    opening: { solo: true, textIndependent: true, partyHudHidden: true },
    characterMovement: { before: characterBefore, after: characterAfter },
    progressBeforeReload: checkpointBeforeReload.prologueProgress,
    progressAfterReload: checkpointAfterReload.prologueProgress,
    checkpointRestored: true,
    soloCombat: { progressiveDisclosure: true, unsafePlanRevises: true, safePlanExecutes: true },
    normalCombat: { sceneFirst: true, actionDock: true, detailOnDemand: true },
    allyPolicy: { rankedForecast: true, detailDefaultClosed: true, publicFirstJointEncounter: true },
    encounterReturn: { titleFree: true, pathSecured: true, timeApplied: publicBattleMinutes, corridorProgress: afterJointSave.corridorProgress, nextInput: 'D' },
    centralScouting: { titleFree: true, centerSecured: true, timeApplied: publicCenterMinutes, corridorsBeforeConfirmation: false, corridorsAfterConfirmation: 4, knownThreats: 2, worldState: { knowledge: afterCenterFrontier.knowledge, corridorsScouted: afterCenterFrontier.corridorsScouted, threat: afterCenterFrontier.threat } },
    policyChoice: { recordLinked: true, spatialResponses: 2, keyboardChoice: '2', selected: publicPolicySave.policyChoice, order: publicPolicySave.policy, keepRange: publicPolicySave.policyDirectives.keepRange },
    delegationPlan: { policy: publicDelegationSave.policyChoice, routeMeters: 400, travelMinutes: 8, knownThreats: 2, retreatAtHp: publicDelegationSave.retreatAtHp, turnLimit: 12, unknownRule: 'PAUSE', suppliesUsed: 0, parallelRule: 'MAX_NOT_SUM', protagonistMinutes: publicDelegationSave.protagonistTaskMinutes },
    regression,
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}

function observeErrors(page, errors) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request ${request.method()} ${request.url()} ${request.failure()?.errorText}`));
}

async function completePublicCombat(page, resultSelector, label, maxTurns) {
  for (let turn = 0; turn < maxTurns; turn += 1) {
    await page.waitForFunction(({ selector }) => document.querySelector(selector) || document.querySelector('.result-overlay:not(.is-seamless-path):not(.is-central-scout-gate)') || document.querySelector('.submission-action-dock:not(.is-busy)'), { selector: resultSelector }, { timeout: 45_000 });
    if (await page.locator(resultSelector).count()) return;
    if (await page.locator('.result-overlay').count()) throw new Error(`Public ${label} combat reached a non-victory result`);
    for (let decision = 0; decision < 3; decision += 1) {
      const slam = page.locator('.submission-action-dock .skill-button[data-action-id="SLAM"][data-executable="true"]:not([disabled])');
      if (await slam.count()) {
        await slam.click();
        break;
      }
      const beforePlans = await page.locator('.submission-action-dock .plan-chip').count();
      let moved = false;
      for (const key of ['D', 'W', 'S', 'A']) {
        const move = page.locator('.submission-action-dock .wasd-grid button').filter({ hasText: key });
        if (!await move.isEnabled()) continue;
        await move.click();
        await page.waitForTimeout(80);
        if (await page.locator('.submission-action-dock .plan-chip').count() > beforePlans) {
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }
    const execute = page.locator('[data-combat-primary="execute-plan"]');
    if (!await execute.isEnabled()) throw new Error(`Public ${label} combat produced no executable plan`);
    await execute.click();
    await page.waitForTimeout(250);
  }
  throw new Error(`Public ${label} combat did not finish within ${maxTurns} turns`);
}

async function savedSubmission(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('isekai-coach:submission:v2') ?? 'null'));
}
