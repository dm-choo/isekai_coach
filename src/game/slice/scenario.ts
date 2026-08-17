import { ABILITY_IDS, type BattleScenario } from '../combat';

export const SLICE_SCENARIO_ID = 'slice-1-barrier-guardian';
export const ADMINISTRATOR_ID = 'administrator-01';
export const ARCHER_ID = 'archer-companion-01';
export const GUARDIAN_ID = 'barrier-guardian-01';

/** Logical topology remains 12x3; the camera decides how much empty terrain to reveal. */
export function createSliceScenario(): BattleScenario {
  return {
    id: SLICE_SCENARIO_ID,
    name: '아마존 결계문 / 결계 수호자',
    map: { width: 12, height: 3 },
    units: [
      {
        id: ADMINISTRATOR_ID,
        faction: 'STUDENT',
        position: { x: 4, y: 1 },
        facing: 'RIGHT',
        hp: 10,
        maxHp: 10,
        ap: 0,
        maxAp: 2,
        abilities: [ABILITY_IDS.PUSH, ABILITY_IDS.SLAM],
        spawnOrder: 0,
        visualKey: 'administrator_slice_01',
      },
      {
        id: ARCHER_ID,
        faction: 'STUDENT',
        position: { x: 2, y: 1 },
        facing: 'RIGHT',
        hp: 8,
        maxHp: 8,
        ap: 0,
        maxAp: 2,
        abilities: [ABILITY_IDS.SHOOT, ABILITY_IDS.PUSH],
        spawnOrder: 1,
        visualKey: 'archer_slice_01',
      },
      {
        id: GUARDIAN_ID,
        faction: 'ENEMY',
        position: { x: 5, y: 1 },
        facing: 'LEFT',
        hp: 18,
        maxHp: 18,
        ap: 0,
        maxAp: 0,
        abilities: [ABILITY_IDS.GUARDIAN_CRUSH, ABILITY_IDS.GUARDIAN_RUPTURE],
        rank: 'BOSS',
        spawnOrder: 2,
        visualKey: 'barrier_guardian_slice_01',
      },
    ],
    enemyPlans: {
      [GUARDIAN_ID]: [
        { abilityId: ABILITY_IDS.GUARDIAN_CRUSH, direction: 'LEFT', anchor: 'BODY' },
        { abilityId: ABILITY_IDS.GUARDIAN_RUPTURE, direction: 'LEFT', anchor: 'BODY' },
        { abilityId: ABILITY_IDS.GUARDIAN_RUPTURE, direction: 'LEFT', anchor: 'BODY' },
      ],
    },
  };
}
