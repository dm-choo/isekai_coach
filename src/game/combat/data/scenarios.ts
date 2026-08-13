import { ABILITY_IDS } from './abilities';
import { defendAction, knockbackAction, slashAction } from '../domain/actions';
import type { BattleScenario, Direction, UnitDefinition } from '../domain/types';

export const SCENARIO_IDS = {
  BASIC: 'basic-1v1',
  WARRIOR_KNOCKBACK: 'warrior-knockback',
  SPEARMAN_KNOCKBACK: 'spearman-knockback',
  KILL_CANCELS_INTENT: 'kill-cancels-intent',
  UNBLOCKABLE_ATTACK: 'unblockable-attack',
  MULTI_ENEMY: 'multi-enemy-1v2',
} as const;

export type ScenarioId = (typeof SCENARIO_IDS)[keyof typeof SCENARIO_IDS];

const DEFAULT_MAP = { width: 12, height: 3 } as const;
const STUDENT_ABILITIES = [
  ABILITY_IDS.DEFEND,
  ABILITY_IDS.THRUST,
  ABILITY_IDS.SLASH,
  ABILITY_IDS.DEBUG_KNOCKBACK,
] as const;

function student(position = { x: 1, y: 1 }): UnitDefinition {
  return {
    id: 'student-01',
    faction: 'STUDENT',
    position,
    facing: 'RIGHT',
    hp: 5,
    maxHp: 5,
    ap: 0,
    maxAp: 2,
    abilities: [...STUDENT_ABILITIES],
    spawnOrder: 0,
    visualKey: 'student_sprite_01',
  };
}

function enemy(
  position: { x: number; y: number },
  abilityId: string,
  overrides: Partial<UnitDefinition> = {},
): UnitDefinition {
  return {
    id: 'enemy-01',
    faction: 'ENEMY',
    position,
    facing: 'LEFT',
    hp: 5,
    maxHp: 5,
    ap: 0,
    maxAp: 0,
    abilities: [abilityId],
    rank: 'NORMAL',
    spawnOrder: 1,
    visualKey: 'enemy_sprite_01',
    ...overrides,
  };
}

function scenario(
  id: ScenarioId,
  name: string,
  studentUnit: UnitDefinition,
  enemyUnit: UnitDefinition,
  abilityId: string,
  direction: Direction = 'LEFT',
): BattleScenario {
  return {
    id,
    name,
    map: { ...DEFAULT_MAP },
    units: [studentUnit, enemyUnit],
    enemyPlans: {
      [enemyUnit.id]: [{ abilityId, direction }],
    },
  };
}

export function createBasicScenario(): BattleScenario {
  return scenario(
    SCENARIO_IDS.BASIC,
    'Basic 1v1',
    student(),
    enemy({ x: DEFAULT_MAP.width - 2, y: 1 }, ABILITY_IDS.ENEMY_THRUST, {
      visualKey: 'enemy_sprite_02',
    }),
    ABILITY_IDS.ENEMY_THRUST,
  );
}

export function createWarriorKnockbackScenario(): BattleScenario {
  const result = scenario(
    SCENARIO_IDS.WARRIOR_KNOCKBACK,
    'Warrior Knockback Test',
    student({ x: 4, y: 1 }),
    enemy({ x: 5, y: 1 }, ABILITY_IDS.SHORT_STRIKE),
    ABILITY_IDS.SHORT_STRIKE,
  );
  return { ...result, studentActions: [knockbackAction('student-01', 'enemy-01', 'RIGHT')] };
}

export function createSpearmanKnockbackScenario(): BattleScenario {
  const result = scenario(
    SCENARIO_IDS.SPEARMAN_KNOCKBACK,
    'Spearman Knockback Test',
    student({ x: 4, y: 1 }),
    enemy({ x: 5, y: 1 }, ABILITY_IDS.ENEMY_THRUST, {
      visualKey: 'enemy_sprite_02',
    }),
    ABILITY_IDS.ENEMY_THRUST,
  );
  return { ...result, studentActions: [knockbackAction('student-01', 'enemy-01', 'RIGHT')] };
}

export function createKillCancelsIntentScenario(): BattleScenario {
  const result = scenario(
    SCENARIO_IDS.KILL_CANCELS_INTENT,
    'Kill Cancels Intent',
    student({ x: 4, y: 1 }),
    enemy({ x: 5, y: 1 }, ABILITY_IDS.SHORT_STRIKE, { hp: 1, maxHp: 1 }),
    ABILITY_IDS.SHORT_STRIKE,
  );
  return { ...result, studentActions: [slashAction('student-01', 'RIGHT')] };
}

export function createUnblockableAttackScenario(): BattleScenario {
  const result = scenario(
    SCENARIO_IDS.UNBLOCKABLE_ATTACK,
    'Unblockable Attack Test',
    student({ x: 4, y: 1 }),
    enemy({ x: 5, y: 1 }, ABILITY_IDS.UNBLOCKABLE_STRIKE),
    ABILITY_IDS.UNBLOCKABLE_STRIKE,
  );
  return { ...result, studentActions: [defendAction('student-01')] };
}

export function createMultiEnemyScenario(): BattleScenario {
  const warrior = enemy({ x: 5, y: 1 }, ABILITY_IDS.SHORT_STRIKE);
  const spearman = enemy(
    { x: 7, y: 1 },
    ABILITY_IDS.ENEMY_THRUST,
    {
      id: 'enemy-02',
      spawnOrder: 2,
      visualKey: 'enemy_sprite_02',
    },
  );
  return {
    id: SCENARIO_IDS.MULTI_ENEMY,
    name: 'Multi-enemy 1v2 Test',
    map: { ...DEFAULT_MAP },
    units: [student({ x: 4, y: 1 }), warrior, spearman],
    enemyPlans: {
      [warrior.id]: [{ abilityId: ABILITY_IDS.SHORT_STRIKE, direction: 'LEFT' }],
      [spearman.id]: [{ abilityId: ABILITY_IDS.ENEMY_THRUST, direction: 'LEFT' }],
    },
    studentActions: [defendAction('student-01')],
  };
}

const FACTORIES: Readonly<Record<ScenarioId, () => BattleScenario>> = {
  [SCENARIO_IDS.BASIC]: createBasicScenario,
  [SCENARIO_IDS.WARRIOR_KNOCKBACK]: createWarriorKnockbackScenario,
  [SCENARIO_IDS.SPEARMAN_KNOCKBACK]: createSpearmanKnockbackScenario,
  [SCENARIO_IDS.KILL_CANCELS_INTENT]: createKillCancelsIntentScenario,
  [SCENARIO_IDS.UNBLOCKABLE_ATTACK]: createUnblockableAttackScenario,
  [SCENARIO_IDS.MULTI_ENEMY]: createMultiEnemyScenario,
};

export const scenarioFactories = FACTORIES;

export function createScenario(id: ScenarioId | string = SCENARIO_IDS.BASIC): BattleScenario {
  const factory = FACTORIES[id as ScenarioId];
  if (!factory) throw new Error(`Unknown combat scenario: ${id}`);
  return factory();
}
