import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import process from 'node:process';

const root = new URL('../', import.meta.url);
const artifactDir = new URL('../artifacts/submission-rc/', import.meta.url);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  ['typecheck', ['run', 'typecheck']],
  ['unit', ['test', '--', '--run']],
  ['submission-build', ['run', 'build:submission']],
  ['submission-interaction', ['run', 'verify:submission:interaction']],
  ['submission-solo-combat', ['run', 'verify:submission:solo-combat']],
  ['submission-normal-combat', ['run', 'verify:submission:normal-combat']],
  ['submission-ally-policy', ['run', 'verify:submission:ally-policy']],
  ['submission-encounter-transition', ['run', 'verify:submission:encounter-transition']],
  ['submission-failure-recovery', ['run', 'verify:submission:failure']],
  ['submission-territory-choice', ['run', 'verify:submission:territory-choice']],
  ['submission-golden-path', ['run', 'verify:submission:golden']],
  ['slice1-build', ['run', 'build:slice']],
  ['slice1-browser', ['run', 'verify:combat-ux']],
  ['slice2-build', ['run', 'build:slice2']],
  ['slice2-golden-path', ['run', 'verify:slice2']],
];
const results = [];
let submissionBundle;

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
  if (name === 'submission-build') submissionBundle = await readSubmissionBundle();
}

const submission = JSON.parse(await readFile(new URL('../artifacts/submission-golden/report.json', import.meta.url), 'utf8'));
const interaction = JSON.parse(await readFile(new URL('../artifacts/submission-interaction/report.json', import.meta.url), 'utf8'));
const failureRecovery = JSON.parse(await readFile(new URL('../artifacts/submission-failure/report.json', import.meta.url), 'utf8'));
const territoryChoice = JSON.parse(await readFile(new URL('../artifacts/submission-territory-choice/report.json', import.meta.url), 'utf8'));
const slice1 = JSON.parse(await readFile(new URL('../artifacts/combat-ux/report.json', import.meta.url), 'utf8'));
const slice2 = JSON.parse(await readFile(new URL('../artifacts/slice2/report.json', import.meta.url), 'utf8'));
if (submission.browserErrors.length || interaction.browserErrors.length || territoryChoice.browserErrors.length || slice1.browserErrors.length || slice2.browserErrors.length) throw new Error('Browser errors remain in an RC flow');
if (failureRecovery.browserErrors.length || failureRecovery.status !== 'FAILURE_RECOVERY_PASS') throw new Error('Submission failure recovery gate did not pass');
if (submission.finalMode !== 'EXPANDED'
  || submission.expansion?.revealedCoordinates?.join(',') !== 'next-east,frontier-north'
  || submission.expansion?.southKnowledge !== 'UNSEEN'
  || submission.expansion?.initialSelection !== null
  || submission.interactionGate?.territoryChoice?.choices?.join(',') !== 'next-east,frontier-north'
  || !submission.interactionGate?.territoryChoice?.initialUnselected
  || !submission.interactionGate?.territoryChoice?.confirmHiddenBeforeSelection
  || submission.interactionGate?.territoryChoice?.pointerChoice !== 'next-east'
  || submission.interactionGate?.territoryChoice?.keyboardChoice !== 'frontier-north'
  || !submission.interactionGate?.territoryChoice?.selectionPreservedWaterTimeAndWorld) {
  throw new Error('Submission product golden-path territory-choice gate did not pass');
}
if (territoryChoice.status !== 'P22_TERRITORY_CHOICE_PASS'
  || territoryChoice.branchParity?.east?.frontierId !== 'next-east'
  || territoryChoice.branchParity?.east?.input !== 'POINTER'
  || territoryChoice.branchParity?.north?.frontierId !== 'frontier-north'
  || territoryChoice.branchParity?.north?.input !== 'W'
  || !territoryChoice.branchParity?.selectionPreservesWaterTimeAndWorld
  || !territoryChoice.branchParity?.commitOwnsPayment
  || !territoryChoice.waterZero?.northPointerInert
  || !territoryChoice.waterZero?.northKeyboardInert
  || !territoryChoice.waterZero?.eastAvailable
  || territoryChoice.completion?.frontierId !== 'frontier-north'
  || !territoryChoice.completion?.reloadPreserved) {
  throw new Error('Submission focused territory-choice gate did not pass');
}
if (slice2.goldenPath?.status !== 'AUTOMATED_PASS') throw new Error('Slice2 golden-path gate did not pass');
const report = await writeReport({
  status: 'TECHNICAL_PASS',
  results,
  submission: {
    finalMode: submission.finalMode,
    worldTime: submission.worldTime,
    vitals: submission.vitals,
    expansion: submission.expansion,
    interactionGate: submission.interactionGate,
    firstInputFeedback: submission.firstInputFeedback,
    browserErrors: submission.browserErrors,
  },
  interaction,
  failureRecovery,
  territoryChoice,
  submissionBundle,
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

async function readSubmissionBundle() {
  const assetsDir = new URL('../dist/assets/', import.meta.url);
  const files = (await readdir(assetsDir)).filter((file) => file.endsWith('.js') || file.endsWith('.css')).sort();
  const entries = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(new URL(file, assetsDir))).size })));
  return {
    assets: entries,
    initialEntryBytes: entries.find((entry) => /^index-.*\.js$/.test(entry.file))?.bytes,
    submissionAppBytes: entries.find((entry) => entry.file.startsWith('SubmissionApp-'))?.bytes,
    deferredCombatBytes: entries.find((entry) => entry.file.startsWith('PhaserCanvas-'))?.bytes,
  };
}

function command(binary, args) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${binary} ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}
