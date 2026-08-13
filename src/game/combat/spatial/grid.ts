import type {
  AttackPattern,
  BattleMapConfig,
  Direction,
  GridPosition,
  Unit,
} from '../domain/types';

export function positionsEqual(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

export function inBounds(map: BattleMapConfig, position: GridPosition): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.x < map.width &&
    position.y >= 0 &&
    position.y < map.height
  );
}

export function manhattanDistance(left: GridPosition, right: GridPosition): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

export function isOccupied(
  units: readonly Unit[],
  position: GridPosition,
  exceptId?: string,
): boolean {
  return units.some(
    (unit) => unit.id !== exceptId && unit.hp > 0 && positionsEqual(unit.position, position),
  );
}

export function step(position: GridPosition, direction: Direction, distance = 1): GridPosition {
  switch (direction) {
    case 'UP':
      return { x: position.x, y: position.y - distance };
    case 'RIGHT':
      return { x: position.x + distance, y: position.y };
    case 'DOWN':
      return { x: position.x, y: position.y + distance };
    case 'LEFT':
      return { x: position.x - distance, y: position.y };
  }
}

export function directionBetween(from: GridPosition, to: GridPosition): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'RIGHT' : 'LEFT';
  return dy >= 0 ? 'DOWN' : 'UP';
}

export function projectPattern(
  origin: GridPosition,
  direction: Direction,
  pattern: AttackPattern,
  map: BattleMapConfig,
): GridPosition[] {
  const result: GridPosition[] = [];
  const seen = new Set<string>();
  for (const cell of pattern.cells) {
    const position = rotateRelative(origin, direction, cell.forward, cell.lateral);
    const key = `${position.x},${position.y}`;
    if (!seen.has(key) && inBounds(map, position)) {
      seen.add(key);
      result.push(position);
    }
  }
  return result;
}

function rotateRelative(
  origin: GridPosition,
  direction: Direction,
  forward: number,
  lateral: number,
): GridPosition {
  switch (direction) {
    case 'RIGHT':
      return { x: origin.x + forward, y: origin.y + lateral };
    case 'DOWN':
      return { x: origin.x - lateral, y: origin.y + forward };
    case 'LEFT':
      return { x: origin.x - forward, y: origin.y - lateral };
    case 'UP':
      return { x: origin.x + lateral, y: origin.y - forward };
  }
}

export function comparePositionLists(
  left: readonly GridPosition[],
  right: readonly GridPosition[],
): boolean {
  return (
    left.length === right.length && left.every((position, index) => positionsEqual(position, right[index]))
  );
}
