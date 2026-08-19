import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const root = new URL('../', import.meta.url);
const artifactDir = new URL('../artifacts/submission-rc/', import.meta.url);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  ['typecheck', ['run', 'typecheck']],
  ['unit', ['test', '--', '--run']],
  ['slice1-build', ['run', 'build:slice']],
  ['slice1-browser', ['run', 'verify:combat-ux']],
  ['slice2-build', ['run', 'build:slice2']],
  ['slice2-golden-path', ['run', 'verify:slice2']],
];
const results = [];

await mkdir(artifactDir, { recursive: true });
for (const [name, args] of steps) {
  const startedAt = Date.now();
  process.stdout.write(`\n[RC] ${name}\n`);
  const result = spawnSync(npm, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  results.push({ name, passed: result.status === 0, durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    await writeReport({ status: 'FAILED', results });
    process.exit(result.status ?? 1);
  }
}

const slice1 = JSON.parse(await readFile(new URL('../artifacts/combat-ux/report.json', import.meta.url), 'utf8'));
const slice2 = JSON.parse(await readFile(new URL('../artifacts/slice2/report.json', import.meta.url), 'utf8'));
if (slice1.browserErrors.length || slice2.browserErrors.length) throw new Error('Browser errors remain in an RC flow');
if (slice2.goldenPath?.status !== 'AUTOMATED_PASS') throw new Error('Slice2 golden-path gate did not pass');
const report = await writeReport({
  status: 'TECHNICAL_PASS',
  results,
  slice1: {
    mode: slice1.mode,
    turn: slice1.turn,
    browserErrors: slice1.browserErrors,
  },
  slice2: {
    mode: slice2.mode,
    combatCount: slice2.combatCount,
    retries: slice2.retries,
    worldTime: slice2.worldTime,
    vitals: slice2.vitals,
    goldenPath: slice2.goldenPath,
    browserErrors: slice2.browserErrors,
  },
  humanGates: {
    status: 'REQUIRED',
    claimsNotAutomated: ['first-use intuition', 'choice conflict', '20-30 minute pacing', 'fun'],
  },
});
process.stdout.write(`\n${JSON.stringify(report, null, 2)}\n`);

async function writeReport(details) {
  const sha = command('git', ['rev-parse', 'HEAD']).trim();
  const dirtyPaths = command('git', ['status', '--porcelain']).trim().split('\n').filter(Boolean);
  const report = {
    generatedAt: new Date().toISOString(),
    sha,
    worktreeClean: dirtyPaths.length === 0,
    dirtyPaths,
    ...details,
  };
  await writeFile(new URL('report.json', artifactDir), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function command(binary, args) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${binary} ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}
