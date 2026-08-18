import { ABILITY_IDS, getAbility } from '../data/abilities';
import { moveAction, thrustAction } from '../domain/actions';
import type {
  CombatAction,
  DecisionContext,
  EnemyIntentContext,
  EnemyIntentPlan,
  EnemyIntentStrategy,
  IntentChoice,
  StudentDecisionStrategy,
} from '../domain/types';
import { directionBetween, projectPattern, positionsEqual, step } from '../spatial/grid';
import { selectNearest } from '../spatial/selectors';

// PROVISIONAL:
// The final player-facing Gambit / combat doctrine system is intentionally
// undecided. These small strategies exist only to exercise the combat kernel.
export class BasicStudentStrategy implements StudentDecisionStrategy {
  public getNextAction(context: DecisionContext): CombatAction | null {
    const { state, student } = context;
    const target = selectNearest(student, state.units, 'ENEMY');
    if (!target) return null;

    const thrust = getAbility(ABILITY_IDS.THRUST);
    const direction = directionBetween(student.position, target.position) ?? student.facing;
    if (
      thrust?.pattern &&
      projectPattern(student.position, direction, thrust.pattern, state.map).some((cell) =>
        positionsEqual(cell, target.position),
      )
    ) {
      return thrustAction(student.id, direction);
    }

    const horizontal = target.position.x === student.position.x ? null : target.position.x > student.position.x ? 'RIGHT' : 'LEFT';
    const vertical = target.position.y === student.position.y ? null : target.position.y > student.position.y ? 'DOWN' : 'UP';
    for (const movementDirection of [horizontal, vertical] as const) {
      if (!movementDirection) continue;
      const destination = step(student.position, movementDirection);
      if (
        destination.x >= 0 &&
        destination.x < state.map.width &&
        destination.y >= 0 &&
        destination.y < state.map.height &&
        !state.units.some(
          (unit) => unit.hp > 0 && positionsEqual(unit.position, destination),
        )
      ) {
        return moveAction(student.id, destination);
      }
    }
    return null;
  }
}

// PROVISIONAL: a deterministic queue for tests and authored sandbox examples.
export class ScriptedStudentStrategy implements StudentDecisionStrategy {
  private cursor = 0;

  public constructor(private readonly actions: readonly CombatAction[]) {}

  public getNextAction(): CombatAction | null {
    const action = this.actions[this.cursor];
    if (!action) return null;
    this.cursor += 1;
    return cloneAction(action);
  }
}

// PROVISIONAL: manual controls call BattleEngine.performStudentAction directly.
export class ManualDebugStrategy implements StudentDecisionStrategy {
  public getNextAction(): null {
    return null;
  }
}

// PROVISIONAL: enemy behavior/decks/weights are intentionally not canonical.
export class ScriptedEnemyStrategy implements EnemyIntentStrategy {
  public constructor(private readonly plans: readonly EnemyIntentPlan[]) {}

  public chooseIntent(context: EnemyIntentContext): IntentChoice | null {
    if (this.plans.length === 0) return null;
    const plan = this.plans[(context.turn - 1) % this.plans.length];
    if (!plan) return null;
    const action = plan.action
      ? cloneAction(plan.action)
      : plan.abilityId
        ? {
            type: 'USE_ABILITY' as const,
            actorId: context.enemy.id,
            abilityId: plan.abilityId,
            direction: plan.direction,
            targetId: plan.targetId,
            groundOrigin: plan.groundOrigin ? { ...plan.groundOrigin } : undefined,
          }
        : null;
    return action
      ? {
          action,
          anchor: plan.anchor,
          direction: plan.direction,
          groundOrigin: plan.groundOrigin ? { ...plan.groundOrigin } : undefined,
          movementPath: plan.movementPath?.map((cell) => ({ ...cell })),
        }
      : null;
  }
}

export function cloneAction(action: CombatAction): CombatAction {
  return action.type === 'MOVE'
    ? { ...action, to: { ...action.to } }
    : {
        ...action,
        groundOrigin: action.groundOrigin ? { ...action.groundOrigin } : undefined,
      };
}
