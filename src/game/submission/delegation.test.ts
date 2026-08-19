import { describe, expect, it } from 'vitest';
import { simulateDelegatedOperation } from './delegation';

describe('same-rule delegated operation', () => {
  it('is exactly deterministic for the same known fixture and policy', () => {
    const first = simulateDelegatedOperation({ directives: { keepRange: true }, retreatAtHp: 2 });
    const replay = simulateDelegatedOperation({ directives: { keepRange: true }, retreatAtHp: 2 });
    expect(replay).toEqual(first);
    expect(first.eventCount).toBeGreaterThan(0);
    expect(first.policySteps.length).toBeGreaterThan(0);
  });

  it('preserves source, decision, coordinates, and result in one reconstructable record', () => {
    const result = simulateDelegatedOperation({ directives: { keepRange: true }, retreatAtHp: 2 });
    expect(result.scenarioId).toBe('submission:delegated-east:known-fixture');
    expect(result.elapsedMinutes).toBe(result.travelMinutes + result.turns);
    expect(result.route[0]).toEqual({ x: 1, y: 1 });
    expect(result.policySteps.every((step) => step.turn > 0 && step.reason.length > 0)).toBe(true);
    expect(result.policySteps.some((step) => step.action?.type === 'MOVE' && step.action.to)).toBe(true);
    expect(Object.values(result.selectedCounts).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
  });

  it('creates a real safety versus completion trade-off between two one-place changes', () => {
    const keepRange = simulateDelegatedOperation({ directives: { keepRange: true }, retreatAtHp: 2 });
    const pushFirst = simulateDelegatedOperation({
      policy: ['PUSH', 'EVADE', 'POSITION', 'SHOOT', 'EMPTY'],
      retreatAtHp: 2,
    });
    expect(keepRange.outcome).toBe('TIME_LIMIT');
    expect(pushFirst.outcome).toBe('SECURED');
    expect(keepRange.finalHp).toBeGreaterThan(pushFirst.finalHp);
    expect(keepRange.elapsedMinutes).toBeGreaterThan(pushFirst.elapsedMinutes);
    expect(keepRange.route).not.toEqual(pushFirst.route);
    expect(keepRange.policySteps.some((step) => step.reason.includes('최소 사거리'))).toBe(true);
    expect(pushFirst.selectedCounts.PUSH).toBeGreaterThan(0);
  });
});
