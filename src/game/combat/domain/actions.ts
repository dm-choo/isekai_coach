import { ABILITY_IDS } from '../data/abilities';
import type {
  CombatAction,
  Direction,
  GridPosition,
  MoveAction,
  UnitId,
  UseAbilityAction,
} from './types';

export function moveAction(actorId: UnitId, to: GridPosition): MoveAction {
  return { type: 'MOVE', actorId, to: { ...to } };
}

export function defendAction(actorId: UnitId): UseAbilityAction {
  return { type: 'USE_ABILITY', actorId, abilityId: ABILITY_IDS.DEFEND };
}

export function thrustAction(actorId: UnitId, direction?: Direction): UseAbilityAction {
  return { type: 'USE_ABILITY', actorId, abilityId: ABILITY_IDS.THRUST, direction };
}

export function slashAction(actorId: UnitId, direction?: Direction): UseAbilityAction {
  return { type: 'USE_ABILITY', actorId, abilityId: ABILITY_IDS.SLASH, direction };
}

export function pushAction(
  actorId: UnitId,
  targetId: UnitId,
  direction?: Direction,
): UseAbilityAction {
  return {
    type: 'USE_ABILITY',
    actorId,
    abilityId: ABILITY_IDS.PUSH,
    targetId,
    direction,
  };
}

export function slamAction(
  actorId: UnitId,
  targetId: UnitId,
  direction?: Direction,
): UseAbilityAction {
  return { type: 'USE_ABILITY', actorId, abilityId: ABILITY_IDS.SLAM, targetId, direction };
}

export function shootAction(
  actorId: UnitId,
  direction: Direction,
  targetId?: UnitId,
): UseAbilityAction {
  return { type: 'USE_ABILITY', actorId, abilityId: ABILITY_IDS.SHOOT, direction, targetId };
}

export function signalThrustAction(actorId: UnitId, direction?: Direction): UseAbilityAction {
  return {
    type: 'USE_ABILITY',
    actorId,
    abilityId: ABILITY_IDS.SIGNAL_THRUST,
    direction,
  };
}

/**
 * PROVISIONAL: developer-only primitive used to exercise forced movement.
 * It is deliberately not a commitment to a player-facing skill.
 */
export function knockbackAction(
  actorId: UnitId,
  targetId: UnitId,
  direction?: Direction,
): UseAbilityAction {
  return {
    type: 'USE_ABILITY',
    actorId,
    abilityId: ABILITY_IDS.DEBUG_KNOCKBACK,
    targetId,
    direction,
  };
}

export const move = moveAction;
export const defend = defendAction;
export const thrust = thrustAction;
export const slash = slashAction;
export const knockback = knockbackAction;
export const debugKnockbackAction = knockbackAction;

export function isMoveAction(action: CombatAction): action is MoveAction {
  return action.type === 'MOVE';
}
