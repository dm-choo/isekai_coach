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
  await page.locator('.submission-action-dock[data-decision-focus="INPUT"]').waitFor();
  if (await page.locator('.turn-banner-player_turn,.submission-action-dock .target-picker,.submission-action-dock .skill-tooltip:visible').count()) {
    throw new Error('Public normal combat hierarchy regressed');
  }
  await page.screenshot({ path: new URL('03-public-normal-combat.png', artifactDir).pathname });
  const publicSlam = page.locator('.submission-action-dock .skill-button[data-executable="true"]').filter({ hasText: '내려찍기' });
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
  await page.locator('.encounter-overlay:not(.is-prologue)').waitFor();
  await page.keyboard.press('Space');
  const publicAllyForecast = page.locator('.ally-intent-panel.is-policy-linked[data-forecast-basis="CURRENT"]');
  await publicAllyForecast.waitFor({ timeout: 30_000 });
  if (await publicAllyForecast.locator('.ally-forecast-token[data-policy-rank][data-policy-id]').count() === 0 || await publicAllyForecast.getAttribute('open') !== null) {
    throw new Error('Public ally forecast lacks policy source or opens detail by default');
  }
  await page.screenshot({ path: new URL('04-public-ally-policy.png', artifactDir).pathname });

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
