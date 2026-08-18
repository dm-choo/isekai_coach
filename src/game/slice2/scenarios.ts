import { ABILITY_IDS, type BattleScenario, type EnemyIntentPlan, type UnitDefinition } from '../combat';
import type { EncounterContent } from './world';

export const SLICE2_ADMINISTRATOR_ID = 'administrator-slice2';
export const SLICE2_ALLY_ID = 'archer-companion-slice2';

export interface ExpeditionVitals {
  readonly administratorHp: number;
  readonly allyHp: number;
}

export interface Slice2EncounterOptions {
  readonly worldMinute?: number;
}

export function createSlice2EncounterScenario(
  encounterId: string,
  content: EncounterContent,
  vitals: ExpeditionVitals,
  options: Slice2EncounterOptions = {},
): BattleScenario {
  const enemyDefinitions = addPatrolReinforcement(enemiesFor(content), options.worldMinute ?? 600);
  const enemyPlans = Object.fromEntries(enemyDefinitions.map((unit) => [
    unit.id,
    plansFor(unit.id),
  ]));
  return {
    id: `slice2:${encounterId}`,
    name: encounterName(content),
    map: { width: 12, height: 3 },
    units: [
      {
        id: SLICE2_ADMINISTRATOR_ID,
        faction: 'STUDENT',
        position: { x: 3, y: 1 },
        facing: 'RIGHT',
        hp: vitals.administratorHp,
        maxHp: 14,
        ap: 0,
        maxAp: 3,
        abilities: [ABILITY_IDS.PUSH, ABILITY_IDS.SLAM],
        spawnOrder: 0,
        visualKey: 'administrator_slice_01',
        combatRole: 'FRONTLINE',
      },
      {
        id: SLICE2_ALLY_ID,
        faction: 'STUDENT',
        position: { x: 1, y: 2 },
        facing: 'RIGHT',
        hp: vitals.allyHp,
        maxHp: 12,
        ap: 0,
        maxAp: 3,
        abilities: [ABILITY_IDS.SHOOT, ABILITY_IDS.PUSH],
        spawnOrder: 1,
        visualKey: 'archer_slice_01',
        combatRole: 'RANGED',
      },
      ...enemyDefinitions,
    ],
    enemyPlans,
  };
}

export function encounterName(content: EncounterContent): string {
  const names: Partial<Record<EncounterContent, string>> = {
    GOBLIN_ARCHER: '수풀 너머의 시위',
    GOBLIN_WARRIOR: '단검의 쇄도',
    GOBLIN_BOMBER: '붉은 포자 폭탄',
    GOBLIN_ARCHER_WARRIOR: '사격선과 추격자',
    GOBLIN_ARCHER_BOMBER: '장거리 봉쇄',
    GOBLIN_TRIO: '고블린 봉쇄선',
    GOBLIN_RUSH_SQUAD: '쌍단검 돌격대',
    GOBLIN_BOMBARDMENT: '포자 포격 호위대',
    GOBLIN_FIRELINE: '이중 사격 봉쇄선',
  };
  return names[content] ?? '통로 조우';
}

function enemiesFor(content: EncounterContent): UnitDefinition[] {
  if (content === 'GOBLIN_RUSH_SQUAD') return [archer('goblin-archer-1', 10, 1, 2), warrior('goblin-warrior-1', 8, 0, 3), warrior('goblin-warrior-2', 8, 2, 4)];
  if (content === 'GOBLIN_BOMBARDMENT') return [warrior('goblin-warrior-1', 8, 1, 2), bomber('goblin-bomber-1', 9, 0, 3), bomber('goblin-bomber-2', 9, 2, 4)];
  if (content === 'GOBLIN_FIRELINE') return [archer('goblin-archer-1', 10, 0, 2), archer('goblin-archer-2', 10, 2, 3), warrior('goblin-warrior-1', 8, 1, 4)];
  const result: UnitDefinition[] = [];
  if (content === 'GOBLIN_ARCHER' || content === 'GOBLIN_ARCHER_WARRIOR' || content === 'GOBLIN_ARCHER_BOMBER' || content === 'GOBLIN_TRIO') result.push(archer('goblin-archer', 10, 1, 2));
  if (content === 'GOBLIN_WARRIOR' || content === 'GOBLIN_ARCHER_WARRIOR' || content === 'GOBLIN_TRIO') result.push(warrior('goblin-warrior', 8, 2, 3));
  if (content === 'GOBLIN_BOMBER' || content === 'GOBLIN_ARCHER_BOMBER' || content === 'GOBLIN_TRIO') result.push(bomber('goblin-bomber', 9, 0, 4));
  return result;
}

function plansFor(enemyId: string): readonly EnemyIntentPlan[] {
  if (enemyId.startsWith('goblin-archer')) {
    return [{ abilityId: ABILITY_IDS.GOBLIN_LONG_SHOT, direction: 'LEFT', anchor: 'BODY' }];
  }
  if (enemyId.startsWith('goblin-warrior')) {
    return [{ abilityId: ABILITY_IDS.GOBLIN_RUSH, direction: 'LEFT', anchor: 'BODY' }];
  }
  return [
    {
      abilityId: ABILITY_IDS.GOBLIN_BOMB,
      direction: 'LEFT',
      anchor: 'GROUND',
      groundOrigin: enemyId.endsWith('-2') ? { x: 2, y: 2 } : { x: 3, y: 1 },
    },
    {
      abilityId: ABILITY_IDS.GOBLIN_BOMB,
      direction: 'LEFT',
      anchor: 'GROUND',
      groundOrigin: enemyId.endsWith('-2') ? { x: 3, y: 0 } : { x: 2, y: 2 },
    },
  ];
}

function archer(id: string, x: number, y: number, spawnOrder: number): UnitDefinition {
  return {
    id, faction: 'ENEMY', position: { x, y }, facing: 'LEFT', hp: 2, maxHp: 2,
    abilities: [ABILITY_IDS.GOBLIN_LONG_SHOT], spawnOrder, visualKey: 'goblin_archer_slice_02', combatRole: 'RANGED',
  };
}

function warrior(id: string, x: number, y: number, spawnOrder: number): UnitDefinition {
  return {
    id, faction: 'ENEMY', position: { x, y }, facing: 'LEFT', hp: 3, maxHp: 3,
    abilities: [ABILITY_IDS.GOBLIN_RUSH], spawnOrder, visualKey: 'goblin_warrior_slice_02', combatRole: 'FRONTLINE',
  };
}

function bomber(id: string, x: number, y: number, spawnOrder: number): UnitDefinition {
  return {
    id, faction: 'ENEMY', position: { x, y }, facing: 'LEFT', hp: 2, maxHp: 2,
    abilities: [ABILITY_IDS.GOBLIN_BOMB], spawnOrder, visualKey: 'goblin_bomber_slice_02', combatRole: 'RANGED',
  };
}

function addPatrolReinforcement(enemies: UnitDefinition[], worldMinute: number): UnitDefinition[] {
  if (worldMinute < 11 * 60 + 30 || enemies.length >= 3) return enemies;
  const occupied = new Set(enemies.map((enemy) => `${enemy.position.x},${enemy.position.y}`));
  const position = [{ x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }].find((candidate) => !occupied.has(`${candidate.x},${candidate.y}`));
  if (!position) return enemies;
  return [...enemies, warrior('goblin-warrior-patrol', position.x, position.y, 2 + enemies.length)];
}
