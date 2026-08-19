import {
  BattleEngine,
  type BattleScenario,
  type BattleState,
  type CombatAction,
  type GridPosition,
} from '../combat';
import {
  DEFAULT_SLICE_POLICY,
  evaluatePolicy,
  type PolicyDirectives,
  type PolicyEvaluation,
  type SlicePolicyId,
} from '../slice';
import { createSlice2EncounterScenario, SLICE2_ADMINISTRATOR_ID, SLICE2_ALLY_ID } from '../slice2';

export type DelegationOutcome = 'SECURED' | 'RETREATED' | 'DEFEAT' | 'TIME_LIMIT';

export interface DelegatedPolicyStep {
  readonly turn: number;
  readonly cycle: number;
  readonly selectedPolicyId: SlicePolicyId | null;
  readonly reason: string;
  readonly action?: {
    readonly type: 'MOVE' | 'ABILITY';
    readonly label: string;
    readonly from: GridPosition;
    readonly to?: GridPosition;
  };
  readonly blockedBeforeSelection: readonly { readonly policyId: SlicePolicyId; readonly reason: string }[];
}

export interface DelegatedActionTrace {
  readonly turn: number;
  readonly action: CombatAction;
}

export interface DelegatedOperationResult {
  readonly scenarioId: string;
  readonly outcome: DelegationOutcome;
  readonly turns: number;
  readonly travelMinutes: number;
  readonly elapsedMinutes: number;
  readonly initialHp: number;
  readonly finalHp: number;
  readonly damageTaken: number;
  readonly selectedCounts: Readonly<Partial<Record<SlicePolicyId, number>>>;
  readonly route: readonly GridPosition[];
  readonly policySteps: readonly DelegatedPolicyStep[];
  readonly actionTrace: readonly DelegatedActionTrace[];
  readonly eventCount: number;
  readonly finalState: BattleState;
}

export interface DelegatedOperationInput {
  readonly allyHp?: number;
  readonly policy?: readonly SlicePolicyId[];
  readonly directives?: PolicyDirectives;
  readonly retreatAtHp?: number;
  readonly worldMinute?: number;
  readonly maxCombatTurns?: number;
}

const ROUTE_TRAVEL_MINUTES = 8;
const MAX_COMBAT_TURNS = 24;

export function createSubmissionDelegationScenario(allyHp = 12, worldMinute = 600): BattleScenario {
  const scenario = createSlice2EncounterScenario(
    'tile-submission-delegated-east',
    'GOBLIN_ARCHER_WARRIOR',
    { administratorHp: 14, allyHp },
    { worldMinute },
  );
  return {
    ...scenario,
    id: 'submission:delegated-east:known-fixture',
    name: '정찰된 동쪽 통로',
    units: scenario.units
      .filter((unit) => unit.id !== SLICE2_ADMINISTRATOR_ID)
      .map((unit) => unit.id === SLICE2_ALLY_ID
        ? { ...unit, position: { x: 1, y: 1 }, facing: 'RIGHT' as const }
        : unit),
  };
}

/**
 * Runs the same deterministic BattleEngine grid, ability, intent and collision
 * rules used by watched combat. Delegation only changes presentation and input source.
 */
export function simulateDelegatedOperation(input: DelegatedOperationInput = {}): DelegatedOperationResult {
  const initialHp = input.allyHp ?? 12;
  const scenario = createSubmissionDelegationScenario(initialHp, input.worldMinute);
  const engine = new BattleEngine(scenario);
  const policy = input.policy ?? DEFAULT_SLICE_POLICY;
  const directives = input.directives ?? {};
  const policySteps: DelegatedPolicyStep[] = [];
  const actionTrace: DelegatedActionTrace[] = [];
  const selectedCounts: Partial<Record<SlicePolicyId, number>> = {};
  const route: GridPosition[] = [{ x: 1, y: 1 }];
  let outcome: DelegationOutcome = 'TIME_LIMIT';

  const maxCombatTurns = Math.min(MAX_COMBAT_TURNS, Math.max(1, input.maxCombatTurns ?? 12));
  for (let turnIndex = 0; turnIndex < maxCombatTurns; turnIndex += 1) {
    engine.beginTurn();
    for (let cycle = 1; cycle <= 8; cycle += 1) {
      const state = engine.getState();
      const ally = state.units.find((unit) => unit.id === SLICE2_ALLY_ID);
      if (!ally || ally.hp <= 0 || ally.ap <= 0 || state.outcome !== 'ONGOING') break;
      const decision = evaluatePolicy(state, SLICE2_ALLY_ID, policy, directives);
      const selected = decision.selected;
      const step = createPolicyStep(state.turn, cycle, ally.position, decision.evaluations, selected);
      policySteps.push(step);
      if (selected) selectedCounts[selected.policyId] = (selectedCounts[selected.policyId] ?? 0) + 1;
      if (!selected?.action) break;
      const result = engine.performStudentAction(selected.action);
      if (!result.executable) break;
      actionTrace.push({ turn: state.turn, action: selected.action });
      if (selected.action.type === 'MOVE') route.push({ ...selected.action.to });
    }
    engine.resolveEnemyIntents();
    const state = engine.getState();
    const ally = state.units.find((unit) => unit.id === SLICE2_ALLY_ID);
    if (state.outcome === 'STUDENT_VICTORY') { outcome = 'SECURED'; break; }
    if (!ally || ally.hp <= 0 || state.outcome === 'ENEMY_VICTORY' || state.outcome === 'DRAW') { outcome = 'DEFEAT'; break; }
    if (input.retreatAtHp !== undefined && ally.hp <= input.retreatAtHp) { outcome = 'RETREATED'; break; }
  }

  const finalState = engine.getState();
  const finalHp = finalState.units.find((unit) => unit.id === SLICE2_ALLY_ID)?.hp ?? 0;
  return {
    scenarioId: scenario.id,
    outcome,
    turns: finalState.turn,
    travelMinutes: ROUTE_TRAVEL_MINUTES,
    elapsedMinutes: ROUTE_TRAVEL_MINUTES + finalState.turn,
    initialHp,
    finalHp,
    damageTaken: initialHp - finalHp,
    selectedCounts,
    route,
    policySteps,
    actionTrace,
    eventCount: engine.getEvents().length,
    finalState,
  };
}

function createPolicyStep(
  turn: number,
  cycle: number,
  from: GridPosition,
  evaluations: readonly PolicyEvaluation[],
  selected?: PolicyEvaluation,
): DelegatedPolicyStep {
  return {
    turn,
    cycle,
    selectedPolicyId: selected?.policyId ?? null,
    reason: selected?.reason ?? '실행 가능한 전술이 없음',
    ...(selected?.action ? { action: actionSummary(selected.action, from) } : {}),
    blockedBeforeSelection: evaluations
      .filter((evaluation) => !evaluation.executable)
      .map((evaluation) => ({ policyId: evaluation.policyId, reason: evaluation.reason })),
  };
}

function actionSummary(action: CombatAction, from: GridPosition): DelegatedPolicyStep['action'] {
  if (action.type === 'MOVE') {
    return { type: 'MOVE', label: '이동', from: { ...from }, to: { ...action.to } };
  }
  const labels: Readonly<Record<string, string>> = { shoot: '사격', push: '밀치기' };
  return { type: 'ABILITY', label: labels[action.abilityId] ?? action.abilityId, from: { ...from } };
}
