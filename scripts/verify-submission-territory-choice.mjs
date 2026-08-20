import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const port = Number(process.env.SUBMISSION_TERRITORY_CHOICE_PORT ?? 4192);
const baseUrl = `http://127.0.0.1:${port}/`;
const saveKey = 'isekai-coach:submission:v3';
const legacySaveKey = 'isekai-coach:submission:v2';
const artifactDir = new URL('../artifacts/submission-territory-choice/', import.meta.url);
let server;
let browser;

await mkdir(artifactDir, { recursive: true });

try {
  server = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], {
    env: { ...process.env, VITE_SLICE: 'submission' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(baseUrl, server);

  browser = await chromium.launch({ headless: true });
  const errors = [];
  const branchFixture = createExpandedFixture(2);
  const east = await verifyCommittedBranch(browser, branchFixture, {
    frontierId: 'next-east', input: 'POINTER', expectedWaterCost: 0, errors,
  });
  const north = await verifyCommittedBranch(browser, branchFixture, {
    frontierId: 'frontier-north', input: 'W', expectedWaterCost: 1, errors,
  });
  assertBranchParity(east, north);

  const waterZero = await verifyWaterZeroFallback(browser, errors);
  const completion = await verifyNorthCompletion(browser, errors);
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  const report = {
    status: 'P22_TERRITORY_CHOICE_PASS',
    url: baseUrl,
    branchParity: {
      east: summarizeBranch(east),
      north: summarizeBranch(north),
      selectionPreservesWaterTimeAndWorld: true,
      commitOwnsPayment: true,
    },
    waterZero,
    completion,
    viewports: ['1280x720', '960x720'],
    textOff: true,
    browserErrors: errors,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}

async function verifyCommittedBranch(browserInstance, fixture, options) {
  const context = await browserInstance.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  observeErrors(page, options.errors);
  try {
    await loadFixture(page, fixture, '[data-frontier-selection="NONE"]');
    await assertChoiceContract(page, 'next-east', { available: true, selected: false, waterCost: 0 });
    await assertChoiceContract(page, 'frontier-north', { available: true, selected: false, waterCost: 1 });
    if (await page.locator('[data-submission-primary="confirm-frontier"]').count()) {
      throw new Error('Frontier confirmation exists before a branch is selected');
    }

    const before = await currentState(page);
    if (options.input === 'POINTER') {
      await page.locator(`[data-frontier-choice="${options.frontierId}"]`).click();
    } else {
      await page.keyboard.press('w');
    }
    await page.locator(`[data-frontier-selection="${options.frontierId}"]`).waitFor();
    await waitForSaved(page, (save) => save?.selectedFrontierId === options.frontierId && save.mode === 'EXPANDED');
    const selected = await currentState(page);
    assertSelectionOnlyChanged(before, selected, options.frontierId);
    await assertChoiceContract(page, options.frontierId, {
      available: true, selected: true, waterCost: options.expectedWaterCost,
    });
    const confirmation = page.locator('[data-submission-primary="confirm-frontier"]');
    if (await confirmation.count() !== 1
      || await confirmation.getAttribute('data-frontier-id') !== options.frontierId
      || Number(await confirmation.getAttribute('data-water-cost')) !== options.expectedWaterCost) {
      throw new Error(`Confirmation diverges from ${options.frontierId}`);
    }

    const viewportName = options.frontierId === 'next-east' ? '00-east-selected-16x9' : '01-north-selected-16x9';
    await assertCriticalLayout(page);
    await captureWithTextOff(page, viewportName, '.submission-expanded strong,.submission-expanded small,.submission-expanded b,.submission-expanded kbd,.submission-topbar strong,.submission-topbar small');
    await page.setViewportSize({ width: 960, height: 720 });
    await assertCriticalLayout(page);
    await captureWithTextOff(page, `${viewportName}-4x3`, '.submission-expanded strong,.submission-expanded small,.submission-expanded b,.submission-expanded kbd,.submission-topbar strong,.submission-topbar small');

    await page.keyboard.press('Space');
    await page.locator(`.submission-corridor[data-route-id="${options.frontierId}"]`).waitFor();
    await waitForSaved(page, (save) => save?.mode === 'CORRIDOR' && save.activeFrontierId === options.frontierId);
    const committed = await currentState(page);
    const expectedWater = before.save.supplies.water - options.expectedWaterCost;
    if (committed.save.supplies.water !== expectedWater
      || committed.save.worldMinute !== before.save.worldMinute
      || committed.save.world.revision !== before.save.world.revision
      || committed.save.selectedFrontierId !== options.frontierId
      || committed.save.activeFrontierId !== options.frontierId
      || (options.expectedWaterCost > 0
        ? committed.save.paidWaterFrontierId !== options.frontierId
        : committed.save.paidWaterFrontierId !== undefined)) {
      throw new Error(`SPACE did not commit ${options.frontierId} with its exact payment: ${JSON.stringify({ before: before.save, committed: committed.save })}`);
    }

    const persisted = persistenceFields(committed.save);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(`.submission-corridor[data-route-id="${options.frontierId}"]`).waitFor();
    await waitForSaved(page, (save) => save?.mode === 'CORRIDOR' && save.activeFrontierId === options.frontierId);
    const restored = await currentState(page);
    if (JSON.stringify(persistenceFields(restored.save)) !== JSON.stringify(persisted)) {
      throw new Error(`${options.frontierId} selected/active/paid state changed after reload`);
    }

    return {
      frontierId: options.frontierId,
      input: options.input,
      expectedWaterCost: options.expectedWaterCost,
      before: before.save,
      selected: selected.save,
      committed: committed.save,
      restored: restored.save,
    };
  } finally {
    await context.close();
  }
}

async function verifyWaterZeroFallback(browserInstance, errors) {
  const context = await browserInstance.newContext({ viewport: { width: 960, height: 720 } });
  const page = await context.newPage();
  observeErrors(page, errors);
  try {
    await loadFixture(page, createExpandedFixture(0), '[data-frontier-selection="NONE"]');
    await assertChoiceContract(page, 'next-east', { available: true, selected: false, waterCost: 0 });
    await assertChoiceContract(page, 'frontier-north', {
      available: false, selected: false, waterCost: 1, blocker: 'WATER_REQUIRED',
    });
    await assertCriticalLayout(page);
    const blockedWaterSignal = await page.locator('[data-frontier-choice="frontier-north"] .frontier-water-fact').evaluate((element) => ({
      opacity: getComputedStyle(element).opacity,
      strike: getComputedStyle(element, '::after').content,
    }));
    if (blockedWaterSignal.opacity !== '1' || blockedWaterSignal.strike === 'none') {
      throw new Error(`Water blocker lost its independent visual signal: ${JSON.stringify(blockedWaterSignal)}`);
    }
    await captureWithTextOff(page, '02-water-zero-blocked-4x3', '.submission-expanded strong,.submission-expanded small,.submission-expanded b,.submission-expanded kbd,.submission-topbar strong,.submission-topbar small');

    const baseline = await currentState(page);
    const north = page.locator('[data-frontier-choice="frontier-north"]');
    await north.dispatchEvent('pointerdown');
    await north.dispatchEvent('pointerup');
    await north.dispatchEvent('click');
    await page.waitForTimeout(80);
    const afterPointer = await currentState(page);
    assertEntireStateEqual(baseline, afterPointer, 'water-zero north pointer input');

    await page.keyboard.press('w');
    await page.waitForTimeout(80);
    const afterKeyboard = await currentState(page);
    assertEntireStateEqual(baseline, afterKeyboard, 'water-zero north keyboard input');

    await page.locator('[data-frontier-choice="next-east"]').click();
    await page.locator('[data-frontier-selection="next-east"]').waitFor();
    await page.keyboard.press('Space');
    await page.locator('.submission-corridor[data-route-id="next-east"]').waitFor();
    await waitForSaved(page, (save) => save?.mode === 'CORRIDOR' && save.activeFrontierId === 'next-east');
    const east = await savedSubmission(page);
    if (east.supplies.water !== 0 || east.selectedFrontierId !== 'next-east'
      || east.activeFrontierId !== 'next-east' || east.paidWaterFrontierId !== undefined) {
      throw new Error(`Water-zero east fallback did not remain free: ${JSON.stringify(east)}`);
    }
    return { northPointerInert: true, northKeyboardInert: true, eastAvailable: true, eastWaterAfterCommit: 0 };
  } finally {
    await context.close();
  }
}

async function verifyNorthCompletion(browserInstance, errors) {
  const context = await browserInstance.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  observeErrors(page, errors);
  try {
    const fixture = createNorthAnchorReadyFixture();
    await loadFixture(page, fixture, '[data-submission-primary="activate-anchor"]');
    const before = await savedSubmission(page);
    await page.keyboard.press('Space');
    await page.locator('[data-submission-stage="complete"]').waitFor();
    await waitForSaved(page, (save) => save?.mode === 'COMPLETE');
    let completed = await savedSubmission(page);
    await assertCompletePresentation(page, completed, before);
    await assertCriticalLayout(page);
    await captureWithTextOff(page, '03-north-complete-16x9', '.submission-complete strong,.submission-complete small,.submission-complete b,.submission-complete kbd,.submission-topbar strong,.submission-topbar small');

    await page.setViewportSize({ width: 960, height: 720 });
    await assertCompletePresentation(page, completed, before);
    await assertCriticalLayout(page);
    await captureWithTextOff(page, '04-north-complete-4x3', '.submission-complete strong,.submission-complete small,.submission-complete b,.submission-complete kbd,.submission-topbar strong,.submission-topbar small');

    const persisted = JSON.stringify(completed);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-submission-stage="complete"]').waitFor();
    await waitForSaved(page, (save) => save?.mode === 'COMPLETE');
    completed = await savedSubmission(page);
    if (JSON.stringify(completed) !== persisted) throw new Error('North COMPLETE save changed after reload');
    await assertCompletePresentation(page, completed, before);
    await page.screenshot({ path: new URL('05-north-complete-restored-4x3.png', artifactDir).pathname });

    return {
      frontierId: completed.activeFrontierId,
      owned: completed.world.tiles.filter((tile) => tile.territory === 'INCORPORATED').map((tile) => tile.id),
      contourEdges: 8,
      nonselectedOutside: 'next-east',
      internalSeams: 0,
      revisionBefore: before.world.revision,
      worldRevision: completed.world.revision,
      reloadPreserved: true,
    };
  } finally {
    await context.close();
  }
}

async function assertCompletePresentation(page, save, before) {
  const stage = page.locator('[data-submission-stage="complete"]');
  const owned = save.world.tiles.filter((tile) => tile.territory === 'INCORPORATED').map((tile) => tile.id);
  const nonselected = save.world.tiles.find((tile) => tile.id === 'next-east');
  if (save.mode !== 'COMPLETE' || save.activeFrontierId !== 'frontier-north'
    || owned.join(',') !== 'initial-barrier,frontier-east,frontier-north'
    || save.world.revision !== before.world.revision + 1
    || save.supplies.water !== before.supplies.water
    || save.paidWaterFrontierId !== 'frontier-north'
    || nonselected?.knowledge !== 'REVEALED' || nonselected.territory !== 'OUTSIDE') {
    throw new Error(`North COMPLETE state is invalid: ${JSON.stringify({ before, save, owned, nonselected })}`);
  }
  if (await stage.getAttribute('data-incorporated-tiles') !== owned.join(',')
    || Number(await stage.getAttribute('data-contour-count')) !== 8
    || Number(await stage.getAttribute('data-world-revision')) !== save.world.revision
    || await stage.getAttribute('data-active-frontier') !== 'frontier-north'
    || await page.locator('[data-world-tile][data-territory="INCORPORATED"]').count() !== 3
    || await page.locator('[data-world-tile="next-east"][data-knowledge="REVEALED"][data-territory="OUTSIDE"]').count() !== 1
    || await page.locator('.expanded-tile-field.is-complete .barrier-edge').count() !== 8
    || await page.locator('[data-submission-primary="restart-submission"][data-primary-key="SPACE"]').count() !== 1) {
    throw new Error('North COMPLETE presentation diverges from its saved world');
  }
  const internalSeams = [
    ['initial-barrier', 'EAST'], ['frontier-east', 'WEST'],
    ['frontier-east', 'NORTH'], ['frontier-north', 'SOUTH'],
  ];
  for (const [tileId, edge] of internalSeams) {
    if (await page.locator(`[data-contour-tile="${tileId}"][data-contour-edge="${edge}"]`).count()) {
      throw new Error(`Internal contour seam remains at ${tileId}:${edge}`);
    }
  }
}

async function assertChoiceContract(page, frontierId, expected) {
  const choice = page.locator(`[data-frontier-choice="${frontierId}"]`);
  if (await choice.count() !== 1
    || await choice.getAttribute('data-available') !== String(expected.available)
    || await choice.getAttribute('data-selected') !== String(expected.selected)
    || Number(await choice.getAttribute('data-water-cost')) !== expected.waterCost
    || !Number.isFinite(Number(await choice.getAttribute('data-route-minutes')))
    || (expected.blocker !== undefined && await choice.getAttribute('data-blocker') !== expected.blocker)) {
    throw new Error(`Frontier choice ${frontierId} diverges from its contract`);
  }
  if (frontierId === 'frontier-north' && expected.selected) {
    const overlap = await page.locator('[data-frontier-choice="frontier-north"] .frontier-route-facts').evaluate((facts) => {
      const factBox = facts.getBoundingClientRect();
      const actorBox = document.querySelector('.world-party.is-expanded img')?.getBoundingClientRect();
      return actorBox ? Math.max(0, Math.min(factBox.right, actorBox.right) - Math.max(factBox.left, actorBox.left))
        * Math.max(0, Math.min(factBox.bottom, actorBox.bottom) - Math.max(factBox.top, actorBox.top)) : 0;
    });
    if (overlap > 0) throw new Error(`North route facts overlap the protagonist by ${overlap}px²`);
  }
}

function assertSelectionOnlyChanged(before, after, frontierId) {
  if (after.save.selectedFrontierId !== frontierId
    || after.save.supplies.water !== before.save.supplies.water
    || after.save.worldMinute !== before.save.worldMinute
    || after.save.world.revision !== before.save.world.revision
    || JSON.stringify(after.save.world) !== JSON.stringify(before.save.world)) {
    throw new Error(`Selecting ${frontierId} mutated water, time, or world state`);
  }
}

function assertBranchParity(east, north) {
  if (east.before.supplies.water !== north.before.supplies.water
    || east.before.worldMinute !== north.before.worldMinute
    || east.before.world.revision !== north.before.world.revision
    || east.selected.supplies.water !== east.before.supplies.water
    || north.selected.supplies.water !== north.before.supplies.water
    || east.committed.supplies.water !== east.before.supplies.water
    || north.committed.supplies.water !== north.before.supplies.water - 1) {
    throw new Error('East pointer and north W paths do not share selection/commit semantics');
  }
}

function assertEntireStateEqual(before, after, label) {
  if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error(`${label} changed authoritative state`);
}

async function assertCriticalLayout(page) {
  if (await page.locator('[data-expanded-map] [data-knowledge="UNSEEN"], [data-complete-map] [data-knowledge="UNSEEN"]').count()) {
    throw new Error('An unseen world tile leaked into the spatial choice map');
  }
  const layout = await page.locator('[data-critical-fit],[data-frontier-choice],.frontier-route-facts').evaluateAll((elements) => ({
    viewport: { width: innerWidth, height: innerHeight },
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bounds: elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { label: element.getAttribute('data-frontier-choice') ?? element.getAttribute('data-submission-primary') ?? element.className, left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }),
  }));
  const invalid = layout.bounds.filter((box) => box.left < -1 || box.top < -1 || box.right > layout.viewport.width + 1 || box.bottom > layout.viewport.height + 1);
  if (layout.overflow > 1 || invalid.length) throw new Error(`P22 layout overflow: ${JSON.stringify({ ...layout, invalid })}`);
}

async function captureWithTextOff(page, name, hiddenSelectors) {
  await page.screenshot({ path: new URL(`${name}.png`, artifactDir).pathname });
  const textOff = await page.addStyleTag({ content: `${hiddenSelectors}{visibility:hidden!important}` });
  await page.screenshot({ path: new URL(`${name}-text-off.png`, artifactDir).pathname });
  await textOff.evaluate((element) => element.remove());
}

async function loadFixture(page, fixture, readySelector) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(({ currentKey, oldKey, save }) => {
    localStorage.removeItem(oldKey);
    localStorage.setItem(currentKey, JSON.stringify(save));
  }, { currentKey: saveKey, oldKey: legacySaveKey, save: fixture });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator(readySelector).waitFor();
  await waitForSaved(page, (save) => save?.version === 3 && save.mode === fixture.mode);
}

async function currentState(page) {
  return page.evaluate((key) => ({
    save: JSON.parse(localStorage.getItem(key) ?? 'null'),
    snapshot: window.__ISEKAI_COACH_SUBMISSION__?.snapshot,
  }), saveKey);
}

async function savedSubmission(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), saveKey);
}

async function waitForSaved(page, predicate) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const save = await savedSubmission(page);
    if (predicate(save)) return save;
    await page.waitForTimeout(25);
  }
  throw new Error('Timed out waiting for the v3 submission save');
}

function persistenceFields(save) {
  return {
    mode: save.mode,
    selectedFrontierId: save.selectedFrontierId,
    activeFrontierId: save.activeFrontierId,
    paidWaterFrontierId: save.paidWaterFrontierId,
    water: save.supplies.water,
    worldMinute: save.worldMinute,
    worldRevision: save.world.revision,
  };
}

function summarizeBranch(branch) {
  return {
    frontierId: branch.frontierId,
    input: branch.input,
    waterCost: branch.expectedWaterCost,
    waterBefore: branch.before.supplies.water,
    waterAfterSelection: branch.selected.supplies.water,
    waterAfterCommit: branch.committed.supplies.water,
    selected: branch.restored.selectedFrontierId,
    active: branch.restored.activeFrontierId,
    paid: branch.restored.paidWaterFrontierId ?? false,
    reloadPreserved: true,
  };
}

function createExpandedFixture(water) {
  return createSaveFixture({
    mode: 'EXPANDED',
    world: createCanonicalWorld(),
    supplies: { water, food: 1 },
    corridorProgress: 400,
    anchorProgress: 400,
    notice: '첫 영토 편입 완료.',
  });
}

function createNorthAnchorReadyFixture() {
  const world = createCanonicalWorld({ northReady: true });
  return createSaveFixture({
    mode: 'ANCHOR_READY',
    world,
    supplies: { water: 1, food: 1 },
    corridorProgress: 600,
    anchorProgress: 600,
    selectedFrontierId: 'frontier-north',
    activeFrontierId: 'frontier-north',
    paidWaterFrontierId: 'frontier-north',
    notice: '북쪽 확장 거점 도착.',
  });
}

function createSaveFixture(overrides) {
  return {
    version: 3,
    mode: overrides.mode,
    world: overrides.world,
    worldMinute: 668,
    prologueProgress: 100,
    soloEncounterResolved: true,
    companionJoined: true,
    corridorProgress: overrides.corridorProgress,
    ...(overrides.selectedFrontierId ? { selectedFrontierId: overrides.selectedFrontierId } : {}),
    ...(overrides.activeFrontierId ? { activeFrontierId: overrides.activeFrontierId } : {}),
    ...(overrides.paidWaterFrontierId ? { paidWaterFrontierId: overrides.paidWaterFrontierId } : {}),
    vitals: { administratorHp: 10, allyHp: 8 },
    supplies: overrides.supplies,
    policy: ['EVADE', 'POSITION', 'SHOOT', 'PUSH', 'EMPTY'],
    policyDirectives: {},
    notice: overrides.notice,
    firstEncounterResolved: true,
    elapsedBattleTurns: 8,
    lastProtagonistTaskMinutes: 0,
    delegationAttempt: 0,
    anchorProgress: overrides.anchorProgress,
    defeatCount: 0,
  };
}

function createCanonicalWorld(options = {}) {
  const tiles = [
    tile('initial-barrier', '깨어난 정원', 0, 0, {
      knowledge: 'SCOUTED', threat: 'SECURED', territory: 'INCORPORATED', utility: 'ACTIVE', stabilized: true,
      corridorsScouted: true, routeSafe: true, anchorPrepared: true, revealsOnIncorporation: ['frontier-east'],
    }),
    tile('frontier-east', '물안개 전초지', 1, 0, {
      knowledge: 'SCOUTED', threat: 'SECURED', territory: 'INCORPORATED', utility: 'ACTIVE', stabilized: true,
      corridorsScouted: true, routeSafe: true, anchorPrepared: true, protagonistAtAnchor: true,
      utilityKind: 'SPRING', revealsOnIncorporation: ['next-east', 'frontier-north'],
    }),
    tile('next-east', '붉은 수관림', 2, 0, {
      knowledge: 'REVEALED', revealsOnIncorporation: [],
    }),
    tile('frontier-north', '기울어진 성소', 1, -1, options.northReady ? {
      knowledge: 'SCOUTED', threat: 'SECURED', corridorsScouted: true, routeSafe: true,
      anchorPrepared: true, protagonistAtAnchor: true, revealsOnIncorporation: [],
    } : { knowledge: 'REVEALED', revealsOnIncorporation: [] }),
    tile('frontier-south', '침수된 회랑', 1, 1, {
      knowledge: 'UNSEEN', revealsOnIncorporation: [],
    }),
  ];
  return { revision: options.northReady ? 11 : 5, tiles };
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

async function waitForServer(url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited with ${child.exitCode}`);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
