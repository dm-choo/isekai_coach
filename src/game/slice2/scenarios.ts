import { ABILITY_IDS, type BattleScenario, type EnemyIntentPlan, type UnitDefinition } from '../combat';
import type { EncounterContent } from './world';

export const SLICE2_ADMINISTRATOR_ID = 'administrator-slice2';
export const SLICE2_ALLY_ID = 'archer-companion-slice2';

export interface ExpeditionVitals {
  readonly administratorHp: number;
  readonly allyHp: number;
}

export function createSlice2EncounterScenario(
  encounterId: string,
  content: EncounterContent,
  vitals: ExpeditionVitals,
): BattleScenario {
  const enemyDefinitions = enemiesFor(content);
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
  };
  return names[content] ?? '통로 조우';
}

function enemiesFor(content: EncounterContent): UnitDefinition[] {
  const result: UnitDefinition[] = [];
  if (content === 'GOBLIN_ARCHER' || content === 'GOBLIN_ARCHER_WARRIOR' || content === 'GOBLIN_ARCHER_BOMBER' || content === 'GOBLIN_TRIO') {
    result.push({
      id: 'goblin-archer', faction: 'ENEMY', position: { x: 10, y: 1 }, facing: 'LEFT',
      hp: 2, maxHp: 2, abilities: [ABILITY_IDS.GOBLIN_LONG_SHOT], spawnOrder: 2,
      visualKey: 'goblin_archer_slice_02', combatRole: 'RANGED',
    });
  }
  if (content === 'GOBLIN_WARRIOR' || content === 'GOBLIN_ARCHER_WARRIOR' || content === 'GOBLIN_TRIO') {
    result.push({
      id: 'goblin-warrior', faction: 'ENEMY', position: { x: 8, y: 2 }, facing: 'LEFT',
      hp: 3, maxHp: 3, abilities: [ABILITY_IDS.GOBLIN_RUSH], spawnOrder: 3,
      visualKey: 'goblin_warrior_slice_02', combatRole: 'FRONTLINE',
    });
  }
  if (content === 'GOBLIN_BOMBER' || content === 'GOBLIN_ARCHER_BOMBER' || content === 'GOBLIN_TRIO') {
    result.push({
      id: 'goblin-bomber', faction: 'ENEMY', position: { x: 9, y: 0 }, facing: 'LEFT',
      hp: 2, maxHp: 2, abilities: [ABILITY_IDS.GOBLIN_BOMB], spawnOrder: 4,
      visualKey: 'goblin_bomber_slice_02', combatRole: 'RANGED',
    });
  }
  return result;
}

function plansFor(enemyId: string): readonly EnemyIntentPlan[] {
  if (enemyId === 'goblin-archer') {
    return [{ abilityId: ABILITY_IDS.GOBLIN_LONG_SHOT, direction: 'LEFT', anchor: 'BODY' }];
  }
  if (enemyId === 'goblin-warrior') {
    return [{ abilityId: ABILITY_IDS.GOBLIN_RUSH, direction: 'LEFT', anchor: 'BODY' }];
  }
  return [
    {
      abilityId: ABILITY_IDS.GOBLIN_BOMB,
      direction: 'LEFT',
      anchor: 'GROUND',
      groundOrigin: { x: 3, y: 1 },
    },
    {
      abilityId: ABILITY_IDS.GOBLIN_BOMB,
      direction: 'LEFT',
      anchor: 'GROUND',
      groundOrigin: { x: 2, y: 2 },
    },
  ];
}
