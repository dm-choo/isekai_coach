import type {
  AbilityDefinition,
  GridPosition,
  Unit,
  UnitId,
  UseAbilityAction,
} from '../domain/types';
import { positionsEqual } from '../spatial/grid';

export interface TargetResolutionContext {
  readonly source: Unit;
  readonly ability: AbilityDefinition;
  readonly action: UseAbilityAction;
  readonly footprint: readonly GridPosition[];
  readonly units: readonly Unit[];
}

/** Resolves affected units independently from effect execution. */
export function resolveAbilityTargets(context: TargetResolutionContext): readonly UnitId[] {
  const { source, ability, action, footprint, units } = context;

  if (ability.targeting === 'SELF') return [source.id];

  if (ability.targeting === 'UNIT') {
    const target = action.targetId
      ? units.find((unit) => unit.id === action.targetId && unit.hp > 0)
      : undefined;
    return target ? [target.id] : [];
  }

  return units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.faction !== source.faction &&
        footprint.some((cell) => positionsEqual(cell, unit.position)),
    )
    .sort(compareStableUnits)
    .map((unit) => unit.id);
}

function compareStableUnits(left: Unit, right: Unit): number {
  return left.spawnOrder - right.spawnOrder || compareIds(left.id, right.id);
}

function compareIds(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
