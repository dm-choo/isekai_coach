import type { Faction, Unit } from '../domain/types';
import { manhattanDistance } from './grid';

/** Lowest HP owns its criterion; the remaining keys are deterministic tie-breakers. */
export function selectLowestHp(
  source: Unit,
  candidates: readonly Unit[],
  faction?: Faction,
): Unit | null {
  return firstSorted(source, candidates, faction, (left, right) =>
    left.hp - right.hp ||
    manhattanDistance(source.position, left.position) -
      manhattanDistance(source.position, right.position) ||
    left.position.y - right.position.y ||
    left.spawnOrder - right.spawnOrder ||
    compareIds(left.id, right.id),
  );
}

/** Nearest owns its criterion rather than inheriting a universal HP-first rule. */
export function selectNearest(
  source: Unit,
  candidates: readonly Unit[],
  faction?: Faction,
): Unit | null {
  return firstSorted(source, candidates, faction, (left, right) =>
    manhattanDistance(source.position, left.position) -
      manhattanDistance(source.position, right.position) ||
    left.hp - right.hp ||
    left.position.y - right.position.y ||
    left.spawnOrder - right.spawnOrder ||
    compareIds(left.id, right.id),
  );
}

function firstSorted(
  source: Unit,
  candidates: readonly Unit[],
  faction: Faction | undefined,
  compare: (left: Unit, right: Unit) => number,
): Unit | null {
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.id !== source.id && candidate.hp > 0 && (!faction || candidate.faction === faction),
      )
      .slice()
      .sort(compare)[0] ?? null
  );
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
