import {
  ABILITY_IDS,
  MOVE_AP_COST,
  getAbility,
  inBounds,
  isOccupied,
  moveAction,
  positionsEqual,
  pushAction,
  shootAction,
  type BattleState,
  type CombatAction,
  type Direction,
  type GridPosition,
  type Unit,
} from '../combat';

export type SlicePolicyId = 'EVADE' | 'POSITION' | 'SHOOT' | 'PUSH' | 'EMPTY';

export const DEFAULT_SLICE_POLICY: readonly SlicePolicyId[] = [
  'EVADE', 'POSITION', 'SHOOT', 'PUSH', 'EMPTY',
];

export const POLICY_COPY: Readonly<Record<SlicePolicyId, {
  readonly name: string;
  readonly tags: readonly string[];
}>> = {
  EVADE: { name: '회피', tags: ['#이동', '#위협대응'] },
  POSITION: { name: '포지셔닝', tags: ['#이동', '#공격준비'] },
  SHOOT: { name: '사격', tags: ['#원거리공격'] },
  PUSH: { name: '밀치기', tags: ['#근거리공격', '#넉백'] },
  EMPTY: { name: '빈 슬롯', tags: [] },
};

export interface PolicyEvaluation {
  readonly policyId: SlicePolicyId;
  readonly executable: boolean;
  readonly reason: string;
  readonly action?: CombatAction;
}

export interface PolicyDecision {
  readonly evaluations: readonly PolicyEvaluation[];
  readonly selected?: PolicyEvaluation;
}

export interface PolicyExecutionStep {
  readonly cycle: number;
  readonly selectedPolicyId: SlicePolicyId | null;
  readonly selectedName: string;
  readonly reason: string;
  readonly evaluations: readonly PolicyEvaluation[];
}

export function evaluatePolicy(
  state: BattleState,
  allyId: string,
  order: readonly SlicePolicyId[] = DEFAULT_SLICE_POLICY,
): PolicyDecision {
  const ally = state.units.find((unit) => unit.id === allyId);
  if (!ally || ally.hp <= 0) return { evaluations: [] };
  const evaluations: PolicyEvaluation[] = [];
  for (const policyId of order) {
    const evaluation = evaluateOne(state, ally, policyId);
    evaluations.push(evaluation);
    if (evaluation.executable) return { evaluations, selected: evaluation };
  }
  return { evaluations };
}

function evaluateOne(state: BattleState, ally: Unit, policyId: SlicePolicyId): PolicyEvaluation {
  switch (policyId) {
    case 'EVADE': return evaluateEvade(state, ally);
    case 'POSITION': return evaluatePosition(state, ally);
    case 'SHOOT': return evaluateShoot(state, ally);
    case 'PUSH': return evaluatePush(state, ally);
    case 'EMPTY': return blocked(policyId, '장착된 전술이 없음');
  }
}

function evaluateEvade(state: BattleState, ally: Unit): PolicyEvaluation {
  if (ally.ap < MOVE_AP_COST) return blocked('EVADE', 'AP 부족');
  const currentDamage = predictedDamage(state, ally.position);
  const destination = adjacentPositions(ally.position)
    .filter((position) => canOccupy(state, ally.id, position))
    .map((position, index) => ({ position, index, damage: predictedDamage(state, position) }))
    .filter((candidate) => candidate.damage < currentDamage)
    .sort((left, right) => left.damage - right.damage || left.index - right.index)[0]?.position;
  return destination
    ? executable('EVADE', '예상 피해가 더 낮은 인접 칸', moveAction(ally.id, destination))
    : blocked('EVADE', currentDamage === 0 ? '현재 위치가 이미 안전함' : '더 안전한 인접 칸이 없음');
}

function evaluatePosition(state: BattleState, ally: Unit): PolicyEvaluation {
  if (ally.ap < MOVE_AP_COST) return blocked('POSITION', 'AP 부족');
  const target = frontmostEnemy(state, ally);
  if (!target) return blocked('POSITION', '표적 없음');
  if (shootDirection(state, ally.position, ally.facing)) {
    return blocked('POSITION', '현재 위치에서 사격 가능');
  }
  const currentDistance = distanceBetween(target.position, ally.position);
  const destination = adjacentPositions(ally.position)
    .filter((position) => canOccupy(state, ally.id, position))
    .map((position, index) => ({
      position,
      index,
      canShoot: shootDirection(state, position, ally.facing) !== null,
      distance: distanceBetween(target.position, position),
      danger: predictedDamage(state, position),
    }))
    .filter((candidate) => candidate.canShoot || candidate.distance < currentDistance)
    .sort((left, right) =>
      Number(right.canShoot) - Number(left.canShoot) ||
      left.danger - right.danger ||
      left.distance - right.distance ||
      left.index - right.index,
    )[0]?.position;
  return destination
    ? executable('POSITION', '가장 앞의 적을 기준으로 사격 위치에 접근', moveAction(ally.id, destination))
    : blocked('POSITION', '한 칸 이동으로 사격 위치에 가까워질 수 없음');
}

function evaluateShoot(state: BattleState, ally: Unit): PolicyEvaluation {
  const ability = getAbility(ABILITY_IDS.SHOOT);
  if (!ability || ally.ap < ability.apCost) return blocked('SHOOT', 'AP 부족');
  const direction = shootDirection(state, ally.position, ally.facing);
  const target = direction ? firstEnemyInLine(state, ally.position, direction) : undefined;
  return direction && target
    ? executable('SHOOT', '같은 행의 가장 앞에 있는 적에게 투사체 발사', shootAction(ally.id, direction, target.id))
    : blocked('SHOOT', '유효 사거리에 적이 없음');
}

function evaluatePush(state: BattleState, ally: Unit): PolicyEvaluation {
  const target = frontmostEnemy(state, ally);
  const ability = getAbility(ABILITY_IDS.PUSH);
  if (!target || !ability || ally.ap < ability.apCost) return blocked('PUSH', target ? 'AP 부족' : '표적 없음');
  if (distanceBetween(target.position, ally.position) !== 1) {
    return blocked('PUSH', '인접한 적이 없음');
  }
  const direction = directionFrom(ally.position, target.position);
  return direction
    ? executable('PUSH', '인접한 적을 1칸 밀침', pushAction(ally.id, target.id, direction))
    : blocked('PUSH', '밀칠 방향을 결정할 수 없음');
}

export function frontmostEnemy(state: BattleState, actor: Unit): Unit | undefined {
  const forward = actor.facing === 'LEFT' ? -1 : 1;
  return state.units
    .filter((unit) => unit.faction !== actor.faction && unit.hp > 0)
    .slice()
    .sort((left, right) => forward > 0
      ? left.position.x - right.position.x || left.spawnOrder - right.spawnOrder
      : right.position.x - left.position.x || left.spawnOrder - right.spawnOrder)[0];
}

function shootDirection(state: BattleState, origin: GridPosition, preferred: Direction): Direction | null {
  const directions: readonly Direction[] = preferred === 'LEFT' ? ['LEFT', 'RIGHT'] : ['RIGHT', 'LEFT'];
  return directions.find((direction) => firstEnemyInLine(state, origin, direction)) ?? null;
}

function firstEnemyInLine(state: BattleState, origin: GridPosition, direction: Direction): Unit | undefined {
  if (direction !== 'LEFT' && direction !== 'RIGHT') return undefined;
  const sign = direction === 'RIGHT' ? 1 : -1;
  for (let distance = 1; distance <= 6; distance += 1) {
    const position = { x: origin.x + sign * distance, y: origin.y };
    const occupant = state.units.find((unit) => unit.hp > 0 && positionsEqual(unit.position, position));
    if (!occupant) continue;
    if (distance < 3 || occupant.faction !== 'ENEMY') return undefined;
    return occupant;
  }
  return undefined;
}

function predictedDamage(state: BattleState, position: GridPosition): number {
  return state.intents.reduce((total, intent) => {
    if (!intent.effectCells.some((cell) => positionsEqual(cell, position))) return total;
    const ability = intent.abilityId ? getAbility(intent.abilityId) : undefined;
    const damage = ability?.effects.find((effect) => effect.type === 'DAMAGE');
    return total + (damage?.type === 'DAMAGE' ? damage.amount : 0);
  }, 0);
}

function canOccupy(state: BattleState, unitId: string, position: GridPosition): boolean {
  return inBounds(state.map, position) && !isOccupied(state.units, position, unitId);
}

function adjacentPositions(position: GridPosition): readonly GridPosition[] {
  return [
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },
    { x: position.x + 1, y: position.y },
    { x: position.x - 1, y: position.y },
  ];
}

function distanceBetween(left: GridPosition, right: GridPosition): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function directionFrom(from: GridPosition, to: GridPosition): Direction | null {
  if (to.x === from.x + 1 && to.y === from.y) return 'RIGHT';
  if (to.x === from.x - 1 && to.y === from.y) return 'LEFT';
  if (to.y === from.y + 1 && to.x === from.x) return 'DOWN';
  if (to.y === from.y - 1 && to.x === from.x) return 'UP';
  return null;
}

function executable(policyId: SlicePolicyId, reason: string, action: CombatAction): PolicyEvaluation {
  return { policyId, executable: true, reason, action };
}

function blocked(policyId: SlicePolicyId, reason: string): PolicyEvaluation {
  return { policyId, executable: false, reason };
}
