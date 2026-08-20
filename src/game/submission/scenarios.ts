import type { BattleScenario } from '../combat';
import {
  SLICE2_ADMINISTRATOR_ID,
  SLICE2_ALLY_ID,
  createSlice2EncounterScenario,
  type EncounterContent,
  type ExpeditionVitals,
} from '../slice2';

export const SUBMISSION_VISUAL_KEYS = {
  administrator: 'administrator_submission_01',
  archer: 'archer_submission_01',
  goblinWarrior: 'goblin_warrior_submission_01',
  goblinArcher: 'goblin_archer_submission_01',
  goblinBomber: 'goblin_bomber_submission_01',
} as const;

export function createSubmissionSoloScenario(
  vitals: ExpeditionVitals,
  worldMinute: number,
): BattleScenario {
  const base = createSlice2EncounterScenario(
    'submission-prologue-solo',
    'GOBLIN_WARRIOR',
    vitals,
    { worldMinute },
  );
  return {
    ...base,
    id: 'submission:prologue:solo-warrior',
    name: '바깥의 첫 위협',
    units: base.units
      .filter((unit) => unit.id !== SLICE2_ALLY_ID)
      .map((unit) => {
        if (unit.id === SLICE2_ADMINISTRATOR_ID) {
          return {
            ...unit,
            position: { x: 3, y: 1 },
            visualKey: SUBMISSION_VISUAL_KEYS.administrator,
          };
        }
        return {
          ...unit,
          position: { x: 7, y: 1 },
          hp: 2,
          maxHp: 2,
          visualKey: SUBMISSION_VISUAL_KEYS.goblinWarrior,
        };
      }),
  };
}

export function createSubmissionJointScenario(
  encounterId: string,
  content: EncounterContent,
  vitals: ExpeditionVitals,
  worldMinute: number,
): BattleScenario {
  const authoredSecondFrontier = encounterId === 'SECOND_EAST_CENTER' || encounterId === 'SECOND_NORTH_CENTER';
  const base = createSlice2EncounterScenario(encounterId, content, vitals, {
    worldMinute: authoredSecondFrontier ? 600 : worldMinute,
  });
  return {
    ...base,
    id: `submission:${encounterId}`,
    units: base.units.map((unit) => ({
      ...unit,
      position: submissionEncounterPosition(encounterId, unit.id, unit.faction, unit.position),
      visualKey: unit.id === SLICE2_ADMINISTRATOR_ID
        ? SUBMISSION_VISUAL_KEYS.administrator
        : unit.id === SLICE2_ALLY_ID
          ? SUBMISSION_VISUAL_KEYS.archer
          : unit.visualKey === 'goblin_archer_slice_02'
            ? SUBMISSION_VISUAL_KEYS.goblinArcher
            : unit.visualKey === 'goblin_bomber_slice_02'
              ? SUBMISSION_VISUAL_KEYS.goblinBomber
              : SUBMISSION_VISUAL_KEYS.goblinWarrior,
    })),
  };
}

function submissionEncounterPosition(
  encounterId: string,
  unitId: string,
  faction: BattleScenario['units'][number]['faction'],
  fallback: BattleScenario['units'][number]['position'],
): BattleScenario['units'][number]['position'] {
  if (faction !== 'ENEMY') return fallback;
  if (encounterId === 'SECOND_EAST_CENTER') {
    if (unitId.includes('warrior')) return { x: 6, y: 1 };
    if (unitId.includes('archer')) return { x: 9, y: 0 };
  }
  if (encounterId === 'SECOND_NORTH_CENTER' && unitId.includes('archer')) return { x: 10, y: 1 };
  return fallback;
}
