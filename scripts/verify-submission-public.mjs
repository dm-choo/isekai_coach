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
  const start = page.locator('[data-submission-primary="start-expedition"]');
  if (await start.count() !== 1 || await start.getAttribute('data-primary-key') !== 'SPACE') throw new Error('Public root primary action is missing');
  const supplyFit = await page.locator('.submission-resources span').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, viewportWidth: window.innerWidth };
  }));
  if (supplyFit.length !== 2 || supplyFit.some((rect) => rect.width <= 0 || rect.left < 0 || rect.right > rect.viewportWidth)) {
    throw new Error(`Public supply HUD is clipped: ${JSON.stringify(supplyFit)}`);
  }
  await page.screenshot({ path: new URL('00-public-root.png', artifactDir).pathname });
  await start.click();
  await page.locator('.submission-corridor').waitFor();
  const move = page.locator('[data-submission-primary="advance-corridor"]');
  await move.dispatchEvent('pointerdown');
  await page.waitForTimeout(130);
  await move.dispatchEvent('pointerup');
  const distanceBeforeReload = (await page.locator('.submission-distance span').innerText()).trim();
  if (distanceBeforeReload.startsWith('0 ')) throw new Error(`Public pointer movement was not accepted: ${distanceBeforeReload}`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.submission-corridor').waitFor();
  const distanceAfterReload = (await page.locator('.submission-distance span').innerText()).trim();
  if (distanceAfterReload !== distanceBeforeReload || await page.locator('.submission-autosave').count() !== 1) {
    throw new Error(`Public checkpoint restore mismatch: ${distanceBeforeReload} → ${distanceAfterReload}`);
  }
  await page.screenshot({ path: new URL('01-public-restored.png', artifactDir).pathname });

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
    primaryAction: 'start-expedition',
    supplyFit,
    distanceBeforeReload,
    distanceAfterReload,
    checkpointRestored: true,
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
