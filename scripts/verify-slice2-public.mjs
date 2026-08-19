import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.SLICE2_URL ?? 'https://openai.ktwome.cc/slice2/';
const artifactDir = new URL('../artifacts/slice2-public/', import.meta.url);
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  const responses = new Map();
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', (response) => responses.set(response.url(), response.status()));

  await page.goto(url, { waitUntil: 'networkidle' });
  if (await page.title() !== 'Slice2') throw new Error(`Unexpected public title: ${await page.title()}`);
  await page.getByRole('button', { name: '원정 시작' }).click();
  await page.locator('.room-door[data-direction="EAST"]').click();
  await page.keyboard.down('d');
  await page.getByRole('button', { name: '전투 시작' }).waitFor();
  await page.keyboard.up('d');
  await page.screenshot({ path: new URL('00-public-encounter.png', artifactDir).pathname });
  await page.getByRole('button', { name: '전투 시작' }).click();
  await page.locator('.enemy-intent-card').filter({ hasText: '단검 쇄도' }).waitFor({ timeout: 20_000 });
  await page.screenshot({ path: new URL('01-public-intent.png', artifactDir).pathname });
  const warriorAsset = [...responses.entries()].find(([assetUrl]) => assetUrl.includes('/assets/slice2/goblin-warrior-v1.png'));
  if (!warriorAsset || warriorAsset[1] !== 200) throw new Error(`Goblin warrior asset was not loaded successfully: ${JSON.stringify(warriorAsset)}`);
  if (errors.length) throw new Error(`Public browser errors:\n${errors.join('\n')}`);
  const report = { url, title: await page.title(), encounter: 'GOBLIN_WARRIOR', intent: 'goblin-rush', warriorAssetStatus: warriorAsset[1], browserErrors: errors };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
