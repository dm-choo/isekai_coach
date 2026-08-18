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

  const occupants = units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.faction !== source.faction &&
        footprint.some((cell) => positionsEqual(cell, unit.position)),
    )
    .sort(compareStableUnits);

  if (ability.patternTargetMode === 'FIRST_IN_PATTERN') {
    const ray = orderedProjectileRay(source, action, footprint);
    for (const cell of ray) {
      const occupant = units.find((unit) => unit.hp > 0 && positionsEqual(cell, unit.position));
      if (!occupant) continue;
      const targetable = footprint.some((candidate) => positionsEqual(candidate, cell));
      return targetable && occupant.faction !== source.faction ? [occupant.id] : [];
    }
    return [];
  }

  return occupants.map((unit) => unit.id);
}

function orderedProjectileRay(
  source: Unit,
  action: UseAbilityAction,
  footprint: readonly GridPosition[],
): readonly GridPosition[] {
  const direction = action.direction;
  if (!direction || footprint.length === 0) return footprint;
  const delta = direction === 'RIGHT' ? { x: 1, y: 0 }
    : direction === 'LEFT' ? { x: -1, y: 0 }
      : direction === 'DOWN' ? { x: 0, y: 1 }
        : { x: 0, y: -1 };
  const distances = footprint.map((cell) =>
    Math.abs(cell.x - source.position.x) + Math.abs(cell.y - source.position.y));
  const maximumDistance = Math.max(...distances);
  return Array.from({ length: maximumDistance }, (_, index) => ({
    x: source.position.x + delta.x * (index + 1),
    y: source.position.y + delta.y * (index + 1),
  }));
}

function compareStableUnits(left: Unit, right: Unit): number {
  return left.spawnOrder - right.spawnOrder || compareIds(left.id, right.id);
}

function compareIds(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
