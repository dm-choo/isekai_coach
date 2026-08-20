import { describe, expect, it } from 'vitest';
import { BattleEngine } from '../combat';
import { createSubmissionDelegationScenario, simulateDelegatedOperation } from './delegation';
import {
  SUBMISSION_FIRST_ROUTE,
  SUBMISSION_FRONTIER_ROUTES,
  getSubmissionRouteSpec,
  isSubmissionFrontierId,
} from './routes';

const PUSH_FIRST = ['PUSH', 'EVADE', 'POSITION', 'SHOOT', 'EMPTY'] as const;

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

  it('replays the delegated action trace through the watched combat engine without divergence', () => {
    const delegated = simulateDelegatedOperation({
      policy: PUSH_FIRST,
      retreatAtHp: 2,
    });
    const watched = new BattleEngine(createSubmissionDelegationScenario());
    for (let turn = 1; turn <= delegated.turns; turn += 1) {
      watched.beginTurn();
      for (const trace of delegated.actionTrace.filter((entry) => entry.turn === turn)) {
        expect(watched.performStudentAction(trace.action).executable).toBe(true);
      }
      watched.resolveEnemyIntents();
    }
    expect(watched.getState()).toEqual(delegated.finalState);
    expect(watched.getEvents()).toHaveLength(delegated.eventCount);
  });

  it('creates a real safety versus completion trade-off between two one-place changes', () => {
    const keepRange = simulateDelegatedOperation({ directives: { keepRange: true }, retreatAtHp: 2 });
    const pushFirst = simulateDelegatedOperation({
      policy: PUSH_FIRST,
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

  it('keeps one authoritative route catalog for the first and two second frontiers', () => {
    expect(SUBMISSION_FIRST_ROUTE).toMatchObject({
      id: 'frontier-east', targetTileId: 'frontier-east', direction: 'EAST',
      distanceMeters: 400, travelMinutes: 8, waterCost: 0, threatCount: 2,
    });
    expect(SUBMISSION_FRONTIER_ROUTES.map((route) => ({
      id: route.id,
      targetTileId: route.targetTileId,
      direction: route.direction,
      distanceMeters: route.distanceMeters,
      travelMinutes: route.travelMinutes,
      waterCost: route.waterCost,
      threatCount: route.threatCount,
    }))).toEqual([
      { id: 'next-east', targetTileId: 'next-east', direction: 'EAST', distanceMeters: 400, travelMinutes: 8, waterCost: 0, threatCount: 2 },
      { id: 'frontier-north', targetTileId: 'frontier-north', direction: 'NORTH', distanceMeters: 600, travelMinutes: 12, waterCost: 1, threatCount: 1 },
    ]);
    expect(getSubmissionRouteSpec('next-east')).toBe(SUBMISSION_FRONTIER_ROUTES[0]);
    expect(getSubmissionRouteSpec('frontier-north')).toBe(SUBMISSION_FRONTIER_ROUTES[1]);
    expect(isSubmissionFrontierId('next-east')).toBe(true);
    expect(isSubmissionFrontierId('frontier-north')).toBe(true);
    expect(isSubmissionFrontierId('frontier-east')).toBe(false);
  });

  it('creates a viable non-dominated second-frontier choice from the real low-HP checkpoint', () => {
    const common = { allyHp: 4, worldMinute: 668, retreatAtHp: 2 } as const;
    const east = simulateDelegatedOperation({ ...common, frontierId: 'next-east', policy: PUSH_FIRST });
    const north = simulateDelegatedOperation({ ...common, frontierId: 'frontier-north', directives: { keepRange: true } });

    expect(east).toMatchObject({
      frontierId: 'next-east', distanceMeters: 400, travelMinutes: 8, waterCost: 0,
      outcome: 'SECURED', turns: 7, elapsedMinutes: 15, finalHp: 3, damageTaken: 1,
    });
    expect(north).toMatchObject({
      frontierId: 'frontier-north', distanceMeters: 600, travelMinutes: 12, waterCost: 1,
      outcome: 'SECURED', turns: 4, elapsedMinutes: 16, finalHp: 4, damageTaken: 0,
    });
    expect(east.elapsedMinutes).toBeLessThan(north.elapsedMinutes);
    expect(east.waterCost).toBeLessThan(north.waterCost);
    expect(east.damageTaken).toBeGreaterThan(north.damageTaken);
  });

  it.each([
    ['next-east', { policy: PUSH_FIRST }],
    ['next-east', { directives: { keepRange: true } }],
    ['frontier-north', { policy: PUSH_FIRST }],
    ['frontier-north', { directives: { keepRange: true } }],
  ] as const)('is deterministic and bounded for %s with either submitted policy', (frontierId, policyInput) => {
    const input = { frontierId, allyHp: 4, worldMinute: 668, retreatAtHp: 2, ...policyInput };
    const first = simulateDelegatedOperation(input);
    const replay = simulateDelegatedOperation(input);
    expect(replay).toEqual(first);
    expect(first.turns).toBeGreaterThan(0);
    expect(first.turns).toBeLessThanOrEqual(12);
  });

  it.each(['next-east', 'frontier-north'] as const)(
    'replays the authored %s action trace through the watched engine without divergence',
    (frontierId) => {
      const delegated = simulateDelegatedOperation({
        frontierId, allyHp: 4, worldMinute: 668, retreatAtHp: 2, policy: PUSH_FIRST,
      });
      const watched = new BattleEngine(createSubmissionDelegationScenario(4, 668, frontierId));
      for (let turn = 1; turn <= delegated.turns; turn += 1) {
        watched.beginTurn();
        for (const trace of delegated.actionTrace.filter((entry) => entry.turn === turn)) {
          expect(watched.performStudentAction(trace.action).executable).toBe(true);
        }
        watched.resolveEnemyIntents();
      }
      expect(watched.getState()).toEqual(delegated.finalState);
      expect(watched.getEvents()).toHaveLength(delegated.eventCount);
    },
  );

  it('does not inject the generic late patrol into an already-authored north route', () => {
    const early = simulateDelegatedOperation({
      frontierId: 'frontier-north', allyHp: 4, worldMinute: 668, retreatAtHp: 2, policy: PUSH_FIRST,
    });
    const late = simulateDelegatedOperation({
      frontierId: 'frontier-north', allyHp: 4, worldMinute: 690, retreatAtHp: 2, policy: PUSH_FIRST,
    });
    expect(late).toEqual(early);
    expect(late.finalState.units.filter((unit) => unit.faction === 'ENEMY').map((unit) => unit.id)).toEqual(['goblin-archer']);
  });
});
